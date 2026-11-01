"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState, type ChangeEvent } from "react";
import { OfferCard } from "@/components/customer/OfferCard";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type OfferFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  offer?: {
    title: string;
    body: string | null;
    imageUrl: string | null;
    startsOn: string | null;
    endsOn: string | null;
    active: boolean;
  };
  locale: string;
};

/** Longest side of an uploaded photo; phone photos shrink from ~4 MB to a few hundred KB. */
const IMAGE_MAX_SIDE = 1600;

/**
 * Offer editor with a live preview of the card as customers see it (§11). A chosen photo is
 * shrunk in the browser before upload; if the browser can't, the original goes up as is.
 */
export function OfferForm({ action, offer, locale }: OfferFormProps) {
  const t = useTranslations("dashboard.offers");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const values = state.status === "error" ? state.values : undefined;

  const [title, setTitle] = useState(values?.title ?? offer?.title ?? "");
  const [body, setBody] = useState(values?.body ?? offer?.body ?? "");
  const [endsOn, setEndsOn] = useState(values?.endsOn ?? offer?.endsOn ?? "");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [shrinking, setShrinking] = useState(false);

  useEffect(() => () => (newImage ? URL.revokeObjectURL(newImage) : undefined), [newImage]);

  // The fields are uncontrolled, so text typed before the page finished loading is kept; the
  // preview picks it up here once React is running.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const field = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value;
    setTitle(field("title") ?? "");
    setBody(field("body") ?? "");
    setEndsOn(field("endsOn") ?? "");
  }, [formRef]);

  async function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return setNewImage(null);
    setShrinking(true);
    const smaller = await shrinkImage(file).catch(() => file);
    setShrinking(false);
    if (smaller !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(smaller);
      input.files = transfer.files;
    }
    setNewImage(URL.createObjectURL(smaller));
    setRemoveImage(false);
  }

  const imageUrl = newImage ?? (removeImage ? null : (offer?.imageUrl ?? null));
  const until = endsOn
    ? t("until", {
        date: new Intl.DateTimeFormat(locale, {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${endsOn}T00:00:00Z`)),
      })
    : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <form
        suppressHydrationWarning
        ref={formRef}
        action={formAction}
        noValidate
        className="flex flex-col gap-4"
      >
        {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
        <TextField
          name="title"
          label={t("titleField")}
          hint={t("titleHint")}
          error={text.fieldError("title")}
          maxLength={60}
          autoComplete="off"
          required
          defaultValue={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="field-body" className="font-semibold">
            {t("body")}
          </label>
          <textarea
            suppressHydrationWarning
            id="field-body"
            name="body"
            rows={3}
            maxLength={200}
            defaultValue={body}
            onChange={(event) => setBody(event.target.value)}
            aria-invalid={text.fieldError("body") ? true : undefined}
            aria-describedby={text.fieldError("body") ? "field-body-error" : undefined}
            className="field-input py-3"
          />
          {text.fieldError("body") ? (
            <p id="field-body-error" className="text-sm font-semibold text-danger">
              {text.fieldError("body")}
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="startsOn"
            type="date"
            label={t("startsOn")}
            hint={t("startsOnHint")}
            error={text.fieldError("startsOn")}
            defaultValue={values?.startsOn ?? offer?.startsOn ?? ""}
          />
          <TextField
            name="endsOn"
            type="date"
            label={t("endsOn")}
            hint={t("endsOnHint")}
            error={text.fieldError("endsOn")}
            defaultValue={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </div>
        <TextField
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          label={t("image")}
          hint={shrinking ? t("imageShrinking") : t("imageHint")}
          error={text.fieldError("image")}
          onChange={onImageChange}
          className="py-2"
        />
        {offer?.imageUrl && !newImage ? (
          <label className="flex min-h-[var(--target-min)] items-center gap-3">
            <input
              suppressHydrationWarning
              type="checkbox"
              name="removeImage"
              checked={removeImage}
              onChange={(event) => setRemoveImage(event.target.checked)}
              className="checkbox-input"
            />
            {t("removeImage")}
          </label>
        ) : null}
        <Checkbox
          name="active"
          defaultChecked={values ? values.active === "on" : (offer?.active ?? true)}
        >
          {t("active")}
        </Checkbox>
        <SubmitButton pendingLabel={t("saving")} disabled={shrinking}>
          {offer ? t("save") : t("create")}
        </SubmitButton>
      </form>

      <section aria-labelledby="preview-heading" className="flex flex-col gap-3">
        <h2 id="preview-heading" className="section-heading">
          {t("preview")}
        </h2>
        <p className="text-sm text-ink-muted">{t("previewHint")}</p>
        <div data-theme="dark" className="app-backdrop rounded-[var(--radius-lg)] p-4 text-ink">
          <OfferCard
            title={title || t("titlePlaceholder")}
            body={body || null}
            imageUrl={imageUrl}
            until={until}
            previewDate
          />
        </div>
      </section>
    </div>
  );
}

async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  // Already small, and a type the server takes: keep the original.
  if (scale === 1 && file.size < 500_000 && /^image\/(jpeg|png|webp)$/.test(file.type)) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) return file;
  return new File([blob], "offer.jpg", { type: "image/jpeg" });
}
