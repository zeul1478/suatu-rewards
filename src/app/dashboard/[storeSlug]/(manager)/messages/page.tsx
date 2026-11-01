import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BroadcastForm } from "@/components/dashboard/BroadcastForm";
import { MessageWordingForm } from "@/components/dashboard/MessageWordingForm";
import { PageTitle, Section } from "@/components/layout";
import { MESSAGE_EVENTS, sampleValues, type MessageEvent } from "@/lib/messages";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import {
  getAudienceCounts,
  getEventSettings,
  getRecentMessages,
} from "@/server/dashboard/messages";
import { listRewards } from "@/server/dashboard/rewards";
import { serverEnv } from "@/server/env";
import { sendQueuedSoon } from "@/server/messages/outbox";
import {
  saveMessageWordingAction,
  sendBroadcastAction,
  sendTestMessageAction,
} from "../../actions";

function isEvent(event: string | null): event is MessageEvent {
  return (MESSAGE_EVENTS as readonly (string | null)[]).includes(event);
}

/** Why a message wasn't sent, as recorded by the sender (src/server/messages/outbox.ts). */
const SKIP_REASONS: Record<
  string,
  "noAccount" | "noAddress" | "turnedOff" | "oneADay" | "removed"
> = {
  "no active account": "noAccount",
  "no address": "noAddress",
  "turned off": "turnedOff",
  "one text a day": "oneADay",
  "message removed": "removed",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.messages");
  return { title: t("metaTitle") };
}

/**
 * Messages (D84): what customers get by text and email for each event, special messages to a
 * group, and what was sent. Customers only get what they opted in to.
 */
export default async function MessagesPage({
  params,
}: PageProps<"/dashboard/[storeSlug]/messages">) {
  const { storeSlug } = await params;
  const { store } = await requireManager(storeSlug);
  const [events, counts, recent, rewards, t] = await Promise.all([
    getEventSettings(store),
    getAudienceCounts(store),
    getRecentMessages(store),
    listRewards(store),
    getTranslations("dashboard.messages"),
  ]);
  // Anything due (e.g. this morning's birthdays) goes out now too.
  sendQueuedSoon();

  const firstReward = rewards.find((reward) => reward.active) ?? rewards[0];
  const sample = sampleValues(
    store.name,
    `${serverEnv().APP_URL}${storeUrl(store.slug)}`,
    firstReward?.name ?? "",
  );
  const when = new Intl.DateTimeFormat(store.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: store.timezone,
  });

  return (
    <>
      <PageTitle title={t("title")} intro={t("intro")} />

      <Section id="automatic" title={t("automaticTitle")}>
        <p className="max-w-2xl text-ink-muted">{t("automaticIntro")}</p>
        {events.map(({ event, sms, email }) => (
          <details key={event} className="panel group">
            <summary className="flex min-h-[var(--target-min)] cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 font-semibold">
              <span className="flex flex-col">
                {t(`events.${event}.name`)}
                <span className="text-sm font-normal text-ink-muted">
                  {t(`events.${event}.when`)}
                </span>
              </span>
              <span className="flex gap-2 text-sm">
                <span className={sms.enabled ? "text-accent" : "text-ink-muted"}>
                  {t(sms.enabled ? "textOn" : "textOff")}
                </span>
                <span aria-hidden="true">·</span>
                <span className={email.enabled ? "text-accent" : "text-ink-muted"}>
                  {t(email.enabled ? "emailOn" : "emailOff")}
                </span>
              </span>
            </summary>
            <div className="grid gap-6 border-t border-line p-4 lg:grid-cols-2">
              {(["sms", "email"] as const).map((channel) => (
                <div key={channel} className="flex flex-col gap-3">
                  <h3 className="font-display text-lg font-semibold">
                    {t(channel === "sms" ? "byText" : "byEmail")}
                  </h3>
                  <MessageWordingForm
                    save={saveMessageWordingAction.bind(null, store.slug, event, channel)}
                    test={sendTestMessageAction.bind(null, store.slug, event, channel)}
                    event={event}
                    channel={channel}
                    initial={channel === "sms" ? sms : email}
                    sample={sample}
                    locale={store.locale}
                  />
                </div>
              ))}
            </div>
          </details>
        ))}
      </Section>

      <Section id="special" title={t("specialTitle")}>
        <p className="max-w-2xl text-ink-muted">{t("specialIntro")}</p>
        <div className="panel panel-pad">
          <BroadcastForm
            action={sendBroadcastAction.bind(null, store.slug)}
            counts={counts}
            sample={sample}
            locale={store.locale}
          />
        </div>
      </Section>

      <Section id="sent" title={t("sentTitle")}>
        {recent.length === 0 ? (
          <p className="text-ink-muted">{t("sentEmpty")}</p>
        ) : (
          <ul className="list-divided">
            {recent.map((message) => (
              <li
                key={message.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
              >
                <span className="flex flex-col">
                  <span className="font-semibold">
                    {message.special
                      ? t("specialMessage")
                      : isEvent(message.event)
                        ? `${t(`events.${message.event}.name`)}${message.test ? ` · ${t("testMessage")}` : ""}`
                        : t("testMessage")}
                  </span>
                  <span className="text-sm text-ink-muted">
                    {when.format(new Date(message.createdAt))} · {t(`channels.${message.channel}`)}
                    {message.to ? ` · ${message.to}` : ""}
                  </span>
                </span>
                <span
                  className={`text-sm font-semibold ${message.status === "failed" ? "text-danger" : message.status === "sent" ? "text-accent" : "text-ink-muted"}`}
                >
                  {t(`status.${message.status as "sent"}`)}
                  {message.status === "skipped" && message.error && SKIP_REASONS[message.error]
                    ? ` · ${t(`skipped.${SKIP_REASONS[message.error]}`)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
