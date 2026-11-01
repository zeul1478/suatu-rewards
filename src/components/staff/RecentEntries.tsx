import { getTranslations } from "next-intl/server";
import type { FormState } from "@/lib/forms";
import type { RecentEntry } from "@/server/points/recentEntries";
import { VoidButton } from "./VoidButton";

type RecentEntriesProps = {
  entries: RecentEntry[];
  voidAction: (transactionId: string) => Promise<FormState>;
};

/** The cashier's latest visits, newest first, with Void for the last 10 minutes (§11). */
export async function RecentEntries({ entries, voidAction }: RecentEntriesProps) {
  const t = await getTranslations("staff");
  if (entries.length === 0) return <p className="text-ink-muted">{t("recentEmpty")}</p>;

  return (
    <ul className="list-divided">
      {entries.map((entry) => (
        <li key={entry.id} className="flex min-h-14 items-center gap-3 py-2">
          <span className="price-digits shrink-0 whitespace-nowrap text-ink-muted">
            {entry.time}
          </span>
          <span
            className={`min-w-0 flex-1 truncate ${entry.voided ? "text-ink-muted line-through" : "text-ink"}`}
          >
            {entry.customer}
          </span>
          <span
            className={`price-digits text-lg ${entry.voided ? "text-ink-muted line-through" : "text-accent"}`}
          >
            +{entry.points}
          </span>
          <div className="flex min-w-20 justify-end">
            {entry.voided ? (
              <span className="text-sm font-semibold text-ink-muted">{t("void.done")}</span>
            ) : (
              <VoidButton
                action={voidAction.bind(null, entry.id)}
                voidableForSeconds={entry.voidableForSeconds}
                label={t("void.label", { customer: entry.customer, time: entry.time })}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
