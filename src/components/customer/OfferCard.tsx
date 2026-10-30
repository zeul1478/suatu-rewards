import { Icon } from "@/components/ui/icons/Icon";

type OfferCardProps = {
  title: string;
  body: string | null;
  imageUrl: string | null;
  /** "Until Nov 30", already formatted; null when the offer has no end date. */
  until: string | null;
  /** The dashboard preview formats the date in the browser (D39): skip that text on hydration. */
  previewDate?: boolean;
  headingLevel?: "h2" | "h3";
};

/** One offer on the customer home (§11), also used as the live preview in the dashboard. */
export function OfferCard({
  title,
  body,
  imageUrl,
  until,
  previewDate,
  headingLevel = "h3",
}: OfferCardProps) {
  const Heading = headingLevel;
  return (
    <article className="card flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own route, already sized when uploaded
        <img
          src={imageUrl}
          alt=""
          className="aspect-[16/9] w-full bg-sunken object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="flex flex-col gap-1.5 p-4">
        <Heading className="flex items-start gap-2 font-display text-xl leading-snug font-bold break-words">
          <Icon name="offer" size={24} className="mt-0.5 shrink-0" />
          {title}
        </Heading>
        {body ? <p className="break-words whitespace-pre-line text-ink-muted">{body}</p> : null}
        {until ? (
          <p className="text-sm font-semibold text-accent" suppressHydrationWarning={previewDate}>
            {until}
          </p>
        ) : null}
      </div>
    </article>
  );
}
