import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { recordAudit } from "@/server/audit";
import { isUuid } from "@/server/dashboard/customers";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

/*
 * Offers (§11): written in the owner dashboard, shown on the customer home while active and
 * inside their dates. Images live in the private "offer-images" bucket and reach phones through
 * the app's own URL (/api/s/<store>/offers/<id>/image), never a storage address.
 */

export const OFFER_IMAGE_BUCKET = "offer-images";
export const OFFER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type Offer = {
  id: string;
  title: string;
  body: string | null;
  /** App URL of the image, with a version so a new image isn't served from a cache. */
  imageUrl: string | null;
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
};

type OfferRow = {
  id: string;
  title: string;
  body: string | null;
  image_path: string | null;
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
  updated_at: string;
};

const FIELDS = "id, title, body, image_path, starts_on, ends_on, active, updated_at";

function toOffer(store: Store, row: OfferRow): Offer {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    imageUrl: row.image_path
      ? `/api/s/${store.slug}/offers/${row.id}/image?v=${Date.parse(row.updated_at)}`
      : null,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    active: row.active,
  };
}

/** Today's date (YYYY-MM-DD) on the store's calendar. */
export function storeToday(store: Store, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: store.timezone }).format(now);
}

/** What customers see today. */
export const getCurrentOffers = cache(async (store: Store): Promise<Offer[]> => {
  const today = storeToday(store);
  const { data, error } = await supabaseAdmin()
    .from("offers")
    .select(FIELDS)
    .eq("store_id", store.id)
    .eq("active", true)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Offers lookup failed: ${error.message}`);
  // Dates are YYYY-MM-DD, so string comparison is date comparison.
  return data
    .filter(
      (row) => (!row.starts_on || row.starts_on <= today) && (!row.ends_on || row.ends_on >= today),
    )
    .map((row) => toOffer(store, row));
});

/** Every offer, for the dashboard. */
export async function listOffers(store: Store): Promise<Offer[]> {
  const { data, error } = await supabaseAdmin()
    .from("offers")
    .select(FIELDS)
    .eq("store_id", store.id)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Offers lookup failed: ${error.message}`);
  return data.map((row) => toOffer(store, row));
}

export async function getOffer(store: Store, offerId: string): Promise<Offer | null> {
  if (!isUuid(offerId)) return null;
  const { data, error } = await supabaseAdmin()
    .from("offers")
    .select(FIELDS)
    .eq("store_id", store.id)
    .eq("id", offerId)
    .maybeSingle();
  if (error) throw new Error(`Offer lookup failed: ${error.message}`);
  return data ? toOffer(store, data) : null;
}

export type OfferInput = {
  title: string;
  body: string | null;
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
  /** A new image, or "remove", or undefined to keep the current one. */
  image?: { bytes: Uint8Array; type: ImageType } | "remove";
};

/** Creates (offerId null) or updates an offer. Returns false when the offer isn't this store's. */
export async function saveOffer(
  store: Store,
  manager: StaffMember,
  offerId: string | null,
  input: OfferInput,
): Promise<boolean> {
  const admin = supabaseAdmin();
  let previousImage: string | null = null;
  if (offerId) {
    if (!isUuid(offerId)) return false;
    const { data } = await admin
      .from("offers")
      .select("image_path")
      .eq("store_id", store.id)
      .eq("id", offerId)
      .maybeSingle();
    if (!data) return false;
    previousImage = data.image_path;
  }

  let imagePath = previousImage;
  if (input.image === "remove") imagePath = null;
  else if (input.image) {
    imagePath = `${store.id}/${randomUUID()}.${input.image.type.split("/")[1]}`;
    const { error } = await admin.storage
      .from(OFFER_IMAGE_BUCKET)
      .upload(imagePath, input.image.bytes, { contentType: input.image.type });
    if (error) throw new Error(`Offer image upload failed: ${error.message}`);
  }

  const values = {
    title: input.title,
    body: input.body,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    active: input.active,
    image_path: imagePath,
  };
  const { data, error } = offerId
    ? await admin.from("offers").update(values).eq("id", offerId).select("id").single()
    : await admin
        .from("offers")
        .insert({ ...values, store_id: store.id })
        .select("id")
        .single();
  if (error) throw new Error(`Offer save failed: ${error.message}`);

  if (previousImage && previousImage !== imagePath) {
    await admin.storage.from(OFFER_IMAGE_BUCKET).remove([previousImage]);
  }
  await recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action: offerId ? "offer.updated" : "offer.created",
    targetType: "offer",
    targetId: data.id,
    details: { title: input.title, active: input.active },
  });
  return true;
}

export async function deleteOffer(
  store: Store,
  manager: StaffMember,
  offerId: string,
): Promise<boolean> {
  if (!isUuid(offerId)) return false;
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("offers")
    .delete()
    .eq("store_id", store.id)
    .eq("id", offerId)
    .select("image_path");
  if (error) throw new Error(`Offer delete failed: ${error.message}`);
  const [deleted] = data;
  if (!deleted) return false;
  if (deleted.image_path) await admin.storage.from(OFFER_IMAGE_BUCKET).remove([deleted.image_path]);
  await recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action: "offer.deleted",
    targetType: "offer",
    targetId: offerId,
  });
  return true;
}

/** The offer's image bytes for the image route, or null. */
export async function readOfferImage(
  store: Store,
  offerId: string,
): Promise<{ body: Blob; type: string } | null> {
  if (!isUuid(offerId)) return null;
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("offers")
    .select("image_path")
    .eq("store_id", store.id)
    .eq("id", offerId)
    .maybeSingle();
  if (!data?.image_path) return null;
  const { data: file, error } = await admin.storage
    .from(OFFER_IMAGE_BUCKET)
    .download(data.image_path);
  if (error || !file) return null;
  return { body: file, type: file.type || "application/octet-stream" };
}

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

/** Trusts the file's first bytes, not its name or the browser's claimed type. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  const starts = (...signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    return "image/webp";
  }
  return null;
}
