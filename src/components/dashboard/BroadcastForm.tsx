"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { FieldError } from "@/components/ui/FieldError";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";
import { renderMessage, smsParts, stopLine, type MessageValues } from "@/lib/messages";

const AUDIENCES = ["all", "lapsed_30", "reward_waiting", "birthday_month"] as const;
const CHANNELS = ["sms", "email"] as const;

/**
 * A special message to a group (D84): who, by text or email, the wording with a preview, and how
 * many people it will reach (only those who opted in). Nothing is sent until "Yes, send it" is
 * ticked.
 */
export function BroadcastForm({
  action,
  counts,
  sample,
  locale,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  counts: Record<string, number>;
  sample: MessageValues;
  locale: string;
}) {
  const t = useTranslations("dashboard.messages");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const values = state.status === "success" ? {} : (state.values ?? {});
  const [audience, setAudience] = useState(values.audience ?? "all");
  const [channel, setChannel] = useState(values.channel ?? "sms");
  const [subject, setSubject] = useState(values.subject ?? "");
  const [body, setBody] = useState(values.body ?? "");
  // Controlled, so the automatic form reset after a rejected send can't untick it unseen.
  const [confirmed, setConfirmed] = useState(false);
  // After a send: an empty form and an unticked box, so the same message can't go out twice.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "success") {
      setSubject("");
      setBody("");
      setConfirmed(false);
    }
  }
  const reach = counts[`${audience}:${channel}`] ?? 0;
  const preview = renderMessage(body, sample) + (channel === "sms" ? ` ${stopLine(locale)}` : "");

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-4"
    >
      {state.status === "success" ? (
        <FormAlert tone="success">{t("broadcastSent", state.formErrorValues)}</FormAlert>
      ) : null}
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 font-semibold">{t("audience")}</legend>
        {AUDIENCES.map((option) => (
          <label key={option} className="flex min-h-[var(--target-min)] items-center gap-3">
            <input
              suppressHydrationWarning
              type="radio"
              name="audience"
              value={option}
              checked={audience === option}
              onChange={() => setAudience(option)}
              className="checkbox-input"
            />
            {t(`audiences.${option}`)}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 font-semibold">{t("channel")}</legend>
        <div className="flex flex-wrap gap-x-6">
          {CHANNELS.map((option) => (
            <label key={option} className="flex min-h-[var(--target-min)] items-center gap-3">
              <input
                suppressHydrationWarning
                type="radio"
                name="channel"
                value={option}
                checked={channel === option}
                onChange={() => setChannel(option)}
                className="checkbox-input"
              />
              {t(`channels.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <p aria-live="polite" className="font-semibold">
        {t("reach", { count: reach })}
      </p>

      {channel === "email" ? (
        <TextField
          idPrefix="broadcast"
          name="subject"
          label={t("subject")}
          error={text.fieldError("subject")}
          maxLength={120}
          autoComplete="off"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="broadcast-body" className="font-semibold">
          {t("wording")}
        </label>
        <p id="broadcast-body-hint" className="text-sm text-ink-muted">
          {t("blanksHint")}
        </p>
        <textarea
          suppressHydrationWarning
          id="broadcast-body"
          name="body"
          rows={4}
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={text.fieldError("body") ? true : undefined}
          aria-describedby={`broadcast-body-hint${text.fieldError("body") ? " broadcast-body-error" : ""}`}
          className="field-input py-3"
        />
        <FieldError id="broadcast-body-error" message={text.fieldError("body")} />
      </div>

      {body ? (
        <div className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-sunken px-4 py-3">
          <p className="text-sm font-semibold text-ink-muted">{t("preview")}</p>
          {channel === "email" ? (
            <p className="font-semibold">{renderMessage(subject, sample)}</p>
          ) : null}
          <p className="whitespace-pre-line">{preview}</p>
          {channel === "sms" ? (
            <p className="text-sm text-ink-muted">
              {t("smsLength", { characters: preview.length, parts: smsParts(preview) })}
            </p>
          ) : null}
        </div>
      ) : null}

      <Checkbox
        idPrefix="broadcast"
        name="confirm"
        error={text.fieldError("confirm")}
        checked={confirmed}
        onChange={setConfirmed}
      >
        {t("confirmSend", { count: reach })}
      </Checkbox>
      <SubmitButton pendingLabel={t("sending")} disabled={reach === 0}>
        {t("send")}
      </SubmitButton>
    </form>
  );
}
