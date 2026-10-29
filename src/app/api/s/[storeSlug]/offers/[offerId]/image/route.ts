import { readOfferImage } from "@/server/offers/offers";
import { getStoreOr404 } from "@/server/stores/getStore";

/**
 * An offer's image (§11). Public like the offer itself; the URL carries ?v=<last change>, so
 * browsers may keep it for a long time.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/s/[storeSlug]/offers/[offerId]/image">,
) {
  const { storeSlug, offerId } = await ctx.params;
  const store = await getStoreOr404(storeSlug);
  const image = await readOfferImage(store, offerId);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.body, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
