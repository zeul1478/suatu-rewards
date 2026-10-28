import { Section } from "./Section";

const tools = [
  {
    name: "Mailpit",
    purpose: "Every email the app sends lands here (password resets).",
    href: process.env.MAILPIT_URL ?? "http://127.0.0.1:55324",
  },
  {
    name: "Supabase Studio",
    purpose: "Browse the database tables.",
    href: process.env.SUPABASE_STUDIO_URL ?? "http://127.0.0.1:55323",
  },
];

export function LocalTools() {
  return (
    <Section title="Local tools" note="These open on the laptop only, not on the phone.">
      <ul className="flex flex-col gap-4">
        {tools.map((tool) => (
          <li key={tool.name} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href={tool.href} target="_blank" rel="noreferrer" className="glass">
              Open {tool.name}
            </a>
            <span className="min-w-0 flex-1 basis-48 text-sm text-ink-muted">{tool.purpose}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
