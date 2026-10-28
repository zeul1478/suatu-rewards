type SignDigitsProps = {
  value: string;
  label: string;
};

/**
 * Characters set in individual tiles, like the numbers on a fuel-price sign.
 * Screen readers get the plain value via the label, not tile by tile.
 */
export function SignDigits({ value, label }: SignDigitsProps) {
  return (
    <span role="img" aria-label={`${label}: ${value}`} className="inline-flex gap-1">
      {[...value].map((char, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="price-digits grid h-12 w-9 place-items-center rounded-[var(--radius-sm)] border border-line bg-sunken text-3xl text-accent"
        >
          {char}
        </span>
      ))}
    </span>
  );
}
