import { platform } from "@/lib/platform";

/**
 * The small "Powered by BeHappy" credit at the foot of every screen (spec §5). Text only, no
 * logo, in its own serif italic; quiet on purpose, so the store's brand leads. Takes the screen's
 * own muted ink, so it suits light and dark screens alike.
 */
export function PoweredBy() {
  return (
    <footer className="flex justify-center pt-8 pb-[max(var(--space-6),env(safe-area-inset-bottom))] print:hidden">
      <p className="text-xs text-ink-muted">
        Powered by{" "}
        <span className="font-[family-name:var(--font-credit)] text-sm tracking-wide italic">
          {platform.name}
        </span>
      </p>
    </footer>
  );
}
