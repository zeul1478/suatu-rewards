export type ThemeMode = "dark" | "light" | "system";

type ThemedImageProps = {
  onDark: string;
  onLight: string;
  /** Intrinsic proportions, so the space is reserved before the file loads (no layout shift). */
  width: number;
  height: number;
  /** Rendered height in px; width follows the proportions. */
  displayHeight: number;
  theme: ThemeMode;
  alt: string;
  className?: string;
  priority?: boolean;
};

/**
 * An image drawn in a dark and a light version (logos, badges). With theme "system" the browser
 * picks the version matching the phone's appearance, with no JavaScript.
 */
export function ThemedImage({
  onDark,
  onLight,
  width,
  height,
  displayHeight,
  theme,
  alt,
  className = "",
  priority = false,
}: ThemedImageProps) {
  const displayWidth = Math.round((width / height) * displayHeight);
  const image = (
    // Plain <img>: these are small vector files with no responsive sizes to generate, and
    // <picture> (below) needs a real <img> inside it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={theme === "light" ? onLight : onDark}
      width={displayWidth}
      height={displayHeight}
      alt={alt}
      className={className}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
  if (theme !== "system") return image;
  return (
    <picture>
      <source srcSet={onLight} media="(prefers-color-scheme: light)" />
      {image}
    </picture>
  );
}
