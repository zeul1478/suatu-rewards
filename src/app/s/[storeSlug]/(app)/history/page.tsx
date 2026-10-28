import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brandFor } from "@/brands";
import { ScreenHeader } from "@/components/customer/ScreenHeader";
import { Icon, type IconName } from "@/components/ui/icons/Icon";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { getHistory, type HistoryEntry } from "@/server/customers/history";
import { getStoreOr404 } from "@/server/stores/getStore";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("history");
  return { title: t("title") };
}

const icons: Record<HistoryEntry["type"], IconName> = {
  earn: "add-visit",
  redeem: "coffee",
  adjust: "edit",
  reversal: "undo",
  expire: "timer",
};

// Visits and redemptions with local date and time, newest first (§11).
export default async function HistoryPage({ params }: PageProps<"/s/[storeSlug]/history">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const [entries, t] = await Promise.all([getHistory(store, customer), getTranslations("history")]);

  return (
    <main className="screen-gutter mx-auto flex w-full max-w-md flex-col gap-6 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[var(--space-8)]">
      <ScreenHeader brand={brandFor(store.slug)} title={t("title")} />

      {entries.length === 0 ? (
        <p className="text-ink-muted">{t("empty", { points: store.pointsPerVisit })}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 py-3">
              <Icon name={icons[entry.type]} className="text-ink-muted" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold text-ink">
                  {t(entry.type, { reward: entry.note ?? "" })}
                </span>
                <span className="text-sm text-ink-muted">{entry.when}</span>
              </div>
              <span
                className={`price-digits text-xl ${entry.points > 0 ? "text-accent" : "text-ink"}`}
              >
                {entry.points > 0 ? `+${entry.points}` : `−${Math.abs(entry.points)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
