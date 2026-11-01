/** One overview number (§11), in the fuel-price-sign digits. */
export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  /** A count, or text such as "68%" or "1.8". */
  value: number | string;
  detail?: string;
}) {
  return (
    <div className="panel panel-pad flex flex-col gap-1">
      <dt className="text-sm font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className="price-digits text-4xl text-ink">
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </dd>
      {detail ? <dd className="text-sm text-ink-muted">{detail}</dd> : null}
    </div>
  );
}
