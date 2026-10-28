import Link from "next/link";
import { CURRENT_MILESTONE, devScreens } from "./screens";
import { Section } from "./Section";

export function ScreenList() {
  return (
    <Section
      title="All screens"
      note="Every screen of the app. Each one becomes a link once its milestone is built."
    >
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {devScreens.map((screen) => {
          const ready = screen.milestone <= CURRENT_MILESTONE;
          return (
            <li
              key={screen.href}
              className="flex min-h-[var(--target-min)] flex-wrap items-center gap-x-4 gap-y-1 py-3"
            >
              <div className="flex min-w-0 flex-1 basis-full flex-col sm:basis-48">
                {ready ? (
                  <Link href={screen.href} className="font-semibold text-ink underline">
                    {screen.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-ink">{screen.name}</span>
                )}
                <span className="text-sm text-ink-muted">{screen.who}</span>
              </div>
              <code className="text-sm break-all text-ink-muted">{screen.href}</code>
              <span
                className={`price-digits rounded-[var(--radius-sm)] border px-2 py-0.5 text-sm tracking-wider uppercase ${
                  ready ? "border-brand text-brand" : "border-line-strong text-ink-muted"
                }`}
              >
                {ready ? "Ready" : `Milestone ${screen.milestone}`}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
