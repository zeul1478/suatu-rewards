import type { Place } from "@/brands";
import { Icon, type IconName } from "@/components/ui/icons/Icon";

type PlaceCardProps = {
  place: Place;
  title: string;
  icon: IconName;
  labels: {
    openDaily: string;
    tryHere: string | null;
    directions: string;
    waze: string;
    call: string;
    whatsapp: string;
  };
};

/**
 * One "Visit us" card on Home (the station, the restaurant): hours, address, a few things to
 * try, and one-tap Directions / Waze / Call / WhatsApp. Plain links, so they open the phone's apps.
 */
export function PlaceCard({ place, title, icon, labels }: PlaceCardProps) {
  const query = encodeURIComponent(place.mapsQuery);
  const digits = place.phone.replace(/\D/g, "");
  const links = [
    {
      href: `https://www.google.com/maps/search/?api=1&query=${query}`,
      label: labels.directions,
      external: true,
    },
    { href: `https://waze.com/ul?q=${query}&navigate=yes`, label: labels.waze, external: true },
    { href: `tel:${place.phone}`, label: labels.call, external: false },
    ...(place.whatsapp
      ? [{ href: `https://wa.me/${digits}`, label: labels.whatsapp, external: true }]
      : []),
  ];

  return (
    <article className="card panel panel-pad flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-display text-xl font-bold">
        <Icon name={icon} size={24} className="shrink-0" />
        {title}
      </h3>
      <div className="flex flex-col gap-1 text-ink-muted">
        <p className="font-semibold text-ink">{labels.openDaily}</p>
        <p>{place.address}</p>
        {labels.tryHere ? <p>{labels.tryHere}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="glass min-h-[var(--target-min)] flex-1 basis-[calc(50%-0.25rem)] justify-center"
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {link.label}
          </a>
        ))}
      </div>
    </article>
  );
}
