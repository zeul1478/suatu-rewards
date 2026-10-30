type FuelGaugeProps = {
  percent: number;
  label: string;
};

// Dial geometry (viewBox units): a 240° sweep around the hub, E at lower left, F at lower right.
const CX = 100;
const CY = 100;
const R = 80;
const SWEEP = 240;
const START = -SWEEP / 2;

/** Hundredths: the server and the phone round sin/cos differently in the last digits. */
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Point on a circle around the hub; 0° is twelve o'clock, angles grow clockwise. Rounded, so the
 * server's HTML and the phone's render agree exactly (no hydration mismatch).
 */
function at(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: round(CX + radius * Math.sin(radians)), y: round(CY - radius * Math.cos(radians)) };
}

const arcStart = at(START, R);
const arcEnd = at(START + SWEEP, R);
const ARC = `M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 1 1 ${arcEnd.x} ${arcEnd.y}`;

// One tick per 5% (a visit at Suatu); longer ones at E, ¼, ½, ¾ and F.
const TICKS = Array.from({ length: 21 }, (_, i) => {
  const angle = START + (SWEEP * i) / 20;
  const major = i % 5 === 0;
  return { from: at(angle, major ? 60 : 65), to: at(angle, 71), major };
});

/**
 * Progress as a round fuel gauge (spec §9), like a car dashboard: the needle swings from E to F
 * and the arc fills behind it. The bottom of the dial stays open for the balance underneath.
 * Transform-only movement, off under reduced motion by the global rule.
 */
export function FuelGauge({ percent, label }: FuelGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const needle = START + (SWEEP * clamped) / 100;
  const labelE = at(START, R + 2);
  const labelF = at(START + SWEEP, R + 2);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <svg viewBox="0 0 200 165" className="fuel-dial block w-full" aria-hidden="true">
        <path d={ARC} className="fuel-dial-edge" fill="none" strokeWidth={16} />
        <path d={ARC} className="fuel-dial-track" fill="none" strokeWidth={12} />
        <path
          d={ARC}
          pathLength={100}
          className="fuel-dial-fill"
          fill="none"
          strokeWidth={12}
          strokeDasharray="100 100"
          style={{ strokeDashoffset: 100 - clamped }}
        />
        {TICKS.map(({ from, to, major }, i) => (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className="fuel-dial-tick"
            strokeWidth={major ? 3 : 1.5}
            strokeLinecap="round"
          />
        ))}
        <text
          x={labelE.x - 6}
          y={labelE.y + 20}
          textAnchor="middle"
          className="price-digits fill-current text-ink-muted"
          fontSize={18}
        >
          E
        </text>
        <text
          x={labelF.x + 6}
          y={labelF.y + 20}
          textAnchor="middle"
          className="price-digits fill-current text-accent"
          fontSize={18}
        >
          F
        </text>
        <g className="fuel-dial-needle" style={{ transform: `rotate(${needle}deg)` }}>
          <path d={`M ${CX - 3.5} ${CY} L ${CX} ${CY - 64} L ${CX + 3.5} ${CY} Z`} />
          <path d={`M ${CX - 3.5} ${CY} L ${CX} ${CY + 14} L ${CX + 3.5} ${CY} Z`} opacity={0.5} />
        </g>
        <circle cx={CX} cy={CY} r={8} className="fuel-dial-hub" />
        <circle cx={CX} cy={CY} r={3} className="fuel-dial-hub-cap" />
      </svg>
    </div>
  );
}
