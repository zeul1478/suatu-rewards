"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { FieldError } from "@/components/ui/FieldError";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";
import {
  MARKETING_EVENTS,
  renderMessage,
  smsParts,
  stopLine,
  type MessageChannel,
  type MessageValues,
} from "@/lib/messages";

type Props = {
  save: (state: FormState, formData: FormData) => Promise<FormState>;
  test: (state: FormState, formData: FormData) => Promise<FormState>;
  event: string;
  channel: MessageChannel;
  initial: { enabled: boolean; subject: string; body: string };
  sample: MessageValues;
  locale: string;
};

/**
 * One automatic message (or a special message's text): on/off, the wording with {blanks}, a
 * live preview filled with a sample customer, the text length, and "send me a test" with the
 * wording on screen (D84).
 */
export function MessageWordingForm({ save, test, event, channel, initial, sample, locale }: Props) {
  const t = useTranslations("dashboard.messages");
  const [saveState, saveAction] = useActionState(save, idleForm);
  const [testState, testAction] = useActionState(test, idleForm);
  const saveText = useFormText(saveState);
  const testText = useFormText(testState);
  const [subject, setSubject] = useState(saveState.values?.subject ?? initial.subject);
  const [body, setBody] = useState(saveState.values?.body ?? initial.body);
  const id = `${event}-${channel}`;

  const marketing = MARKETING_EVENTS.includes(event);
  const preview =
    renderMessage(body, sample) + (channel === "sms" && marketing ? ` ${stopLine(locale)}` : "");
  const parts = smsParts(preview);

  return (
    <form suppressHydrationWarning action={saveAction} noValidate className="flex flex-col gap-4">
      {saveState.status === "success" ? <FormAlert tone="success">{t("saved")}</FormAlert> : null}
      {testState.status === "success" ? (
        <FormAlert tone="success">{t("testQueued")}</FormAlert>
      ) : null}
      {testText.formError ? <FormAlert tone="error">{testText.formError}</FormAlert> : null}

      <Checkbox idPrefix={id} name="enabled" defaultChecked={initial.enabled}>
        {t(channel === "sms" ? "sendText" : "sendEmail")}
      </Checkbox>

      {channel === "email" ? (
        <TextField
          idPrefix={id}
          name="subject"
          label={t("subject")}
          error={saveText.fieldError("subject")}
          maxLength={120}
          autoComplete="off"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-body`} className="font-semibold">
          {t("wording")}
        </label>
        <p id={`${id}-body-hint`} className="text-sm text-ink-muted">
          {t("blanksHint")}
        </p>
        <textarea
          suppressHydrationWarning
          id={`${id}-body`}
          name="body"
          rows={channel === "sms" ? 3 : 6}
          maxLength={1000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={saveText.fieldError("body") ? true : undefined}
          aria-describedby={`${id}-body-hint${saveText.fieldError("body") ? ` ${id}-body-error` : ""}`}
          className="field-input py-3"
        />
        <FieldError id={`${id}-body-error`} message={saveText.fieldError("body")} />
      </div>

      <div className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-sunken px-4 py-3">
        <p className="text-sm font-semibold text-ink-muted">{t("preview")}</p>
        {channel === "email" ? (
          <p className="font-semibold">{renderMessage(subject, sample)}</p>
        ) : null}
        <p className="whitespace-pre-line">{preview}</p>
        {channel === "sms" ? (
          <p className="text-sm text-ink-muted">
            {t("smsLength", { characters: preview.length, parts })}
          </p>
        ) : null}
      </div>

      <SubmitButton variant="secondary" pendingLabel={t("saving")}>
        {t("save")}
      </SubmitButton>

      <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
        <legend className="sr-only">{t("testTitle")}</legend>
        <TextField
          idPrefix={`${id}-test`}
          name="to"
          label={t(channel === "sms" ? "testPhone" : "testEmail")}
          error={testText.fieldError("to")}
          type={channel === "sms" ? "tel" : "email"}
          inputMode={channel === "sms" ? "tel" : "email"}
          autoComplete={channel === "sms" ? "tel" : "email"}
          defaultValue={testState.values?.to}
        />
        <button type="submit" formAction={testAction} formNoValidate className="glass w-fit">
          {t("sendTest")}
        </button>
      </fieldset>
    </form>
  );
}
