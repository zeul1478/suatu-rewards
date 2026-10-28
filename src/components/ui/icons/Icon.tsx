import { iconPaths, type IconName } from "./iconPaths";

type IconProps = {
  name: IconName;
  /** 20 dense lists · 24 default · 28 bottom nav · 32+ big staff buttons (icons README). */
  size?: number;
  /** Give a label only when the icon is the only content (it becomes an image for screen readers). */
  label?: string;
  className?: string;
};

/**
 * One of the Suatu icons (brand/suatu/icons). Inline SVG so both tones follow the theme: the
 * main lines use the text colour (currentColor), the detail uses --icon-accent. The stroke stays
 * 2 px at every size.
 */
export function Icon({ name, size = 24, label, className = "" }: IconProps) {
  const { main, accent } = iconPaths[name];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={`icon shrink-0 ${className}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      focusable="false"
    >
      {/* Markup generated from the brand kit and checked to be plain shapes (scripts/build-icons.mjs). */}
      <g dangerouslySetInnerHTML={{ __html: main }} />
      {accent ? (
        <g stroke="var(--icon-accent, currentColor)" dangerouslySetInnerHTML={{ __html: accent }} />
      ) : null}
    </svg>
  );
}

export type { IconName };
