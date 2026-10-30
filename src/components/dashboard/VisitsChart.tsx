import type { CSSProperties } from "react";

type VisitsChartProps = {
  days: { day: string; visits: number }[];
  /** "Oct 29": how a day is written under the chart and in its labels. */
  formatDay: (day: string) => string;
  title: string;
  /** Read out instead of the bars, e.g. "120 visits in 30 days, most on Oct 20 (12)". */
  summary: string;
  tableLabel: string;
  dayHeader: string;
  visitsHeader: string;
  /** "12 visits": the hover label on a bar. */
  barLabel: (visits: number) => string;
};

/**
 * Visits per day as thin bars (D79): one series in the brand colour, so no legend; the title
 * names it. Plain HTML and CSS, no chart library. Hovering or tapping a bar shows its day and
 * count; screen readers get the summary, and everyone can open the numbers as a table.
 */
export function VisitsChart({
  days,
  formatDay,
  title,
  summary,
  tableLabel,
  dayHeader,
  visitsHeader,
  barLabel,
}: VisitsChartProps) {
  const highest = Math.max(1, ...days.map((d) => d.visits));
  const first = days[0];
  const last = days.at(-1);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
        {title}
      </figcaption>
      <div role="img" aria-label={summary} className="visits-chart">
        <span className="visits-chart-max" aria-hidden="true">
          {highest}
        </span>
        <ol className="visits-chart-bars" aria-hidden="true">
          {days.map((d) => (
            <li
              key={d.day}
              className="visits-chart-bar"
              data-tip={`${formatDay(d.day)} · ${barLabel(d.visits)}`}
              style={{ "--h": `${(d.visits / highest) * 100}%` } as CSSProperties}
            />
          ))}
        </ol>
      </div>
      {first && last ? (
        <div className="flex justify-between text-xs text-ink-muted" aria-hidden="true">
          <span>{formatDay(first.day)}</span>
          <span>{formatDay(last.day)}</span>
        </div>
      ) : null}
      <details>
        <summary className="w-fit cursor-pointer text-sm font-semibold text-accent">
          {tableLabel}
        </summary>
        <table className="mt-2 w-full max-w-xs text-sm">
          <thead>
            <tr className="text-left text-ink-muted">
              <th className="py-1 font-semibold">{dayHeader}</th>
              <th className="py-1 text-right font-semibold">{visitsHeader}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-t border-line">
                <td className="py-1">{formatDay(d.day)}</td>
                <td className="price-digits py-1 text-right">{d.visits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
