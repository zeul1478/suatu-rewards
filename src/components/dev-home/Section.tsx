type SectionProps = {
  title: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
};

export function Section({ title, note, children, className = "" }: SectionProps) {
  const headingId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="font-display text-xl font-semibold tracking-wide text-ink uppercase"
        >
          {title}
        </h2>
        {note ? <p className="text-sm text-ink-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}
