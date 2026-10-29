/** One overview number (§11), in the fuel-price-sign digits. */
export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-line bg-raised p-4">
      <dt className="text-sm font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className="price-digits text-4xl text-ink">{value.toLocaleString("en-US")}</dd>
      {detail ? <dd className="text-sm text-ink-muted">{detail}</dd> : null}
    </div>
  );
}
