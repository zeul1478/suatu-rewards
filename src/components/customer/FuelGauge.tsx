type FuelGaugeProps = {
  percent: number;
  label: string;
};

/**
 * Progress as a fuel gauge (spec §9): E to F, a tick per visit-sized step, filling with a short
 * transform-only animation (disabled under reduced motion by the global rule).
 */
export function FuelGauge({ percent, label }: FuelGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="price-digits text-lg text-ink-muted">
        E
      </span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className="fuel-gauge relative h-5 flex-1 overflow-hidden rounded-[var(--radius-sm)]"
      >
        <div
          className="fuel-gauge-fill absolute inset-0"
          style={{ transform: `scaleX(${clamped / 100})` }}
        />
        <div className="fuel-gauge-ticks absolute inset-0" aria-hidden="true" />
      </div>
      <span aria-hidden="true" className="price-digits text-lg text-accent">
        F
      </span>
    </div>
  );
}
