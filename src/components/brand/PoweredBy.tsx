import { platform } from "@/lib/platform";
import { ThemedImage, type ThemeMode } from "./ThemedImage";

/** The small "Powered by behappy" credit (spec §5). Quiet on purpose: the store's brand leads. */
export function PoweredBy({ theme }: { theme: ThemeMode }) {
  return (
    <footer className="flex justify-center pt-8 pb-[max(var(--space-6),env(safe-area-inset-bottom))] opacity-80">
      <ThemedImage
        {...platform.poweredBy}
        displayHeight={18}
        theme={theme}
        alt={`Powered by ${platform.name}`}
      />
    </footer>
  );
}
