import { notFound } from "next/navigation";
import { BrandHeader, Screen } from "@/components/layout";
import { recordedTexts, smsSender } from "@/server/integrations/sms";

export const metadata = { title: "Texts (dev)" };

/**
 * Development only: the texts the app "sent" while Twilio isn't set up (latest first). Lets the
 * user try automatic and special messages on the laptop before real texts are connected.
 */
export default function DevTextsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const live = smsSender().live;
  const texts = recordedTexts();
  return (
    <Screen>
      <BrandHeader
        logo={<p className="font-display text-lg font-semibold text-ink-muted uppercase">dev</p>}
        title="Texts"
        intro={
          live
            ? "Twilio is set up: texts really go out, so nothing is kept here."
            : "Twilio isn't set up, so texts stay on this laptop. Newest first; refresh to update."
        }
      />
      {texts.length === 0 ? (
        <p className="text-ink-muted">No texts yet.</p>
      ) : (
        <ul className="list-divided">
          {texts.map((text) => (
            <li key={text.at + text.to} className="flex flex-col gap-1 py-3">
              <span className="text-sm text-ink-muted">
                {new Date(text.at).toLocaleString()} · {text.to}
              </span>
              <span className="whitespace-pre-line">{text.body}</span>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
