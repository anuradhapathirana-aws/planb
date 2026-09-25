import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, Monitor } from 'lucide-react';

import { formatMoney } from '@shared/lib/formatters';
import { paths } from '@/routes/paths';
import type { ProgrammeCard as Programme } from '@/features/marketing/homeContent';

/**
 * One course tile, as it appears on the home page and (from `PUB-3`) in the
 * catalogue. Written once so the two never drift apart.
 *
 * The whole card is a link, but the visible "View details" button is the
 * affordance — `after:absolute inset-0` on the title link stretches its hit area
 * over the card while leaving exactly one link in the accessibility tree.
 * Wrapping the card in an `<a>` and nesting a second one inside would be invalid
 * markup and reads terribly in a screen reader.
 */
export function ProgrammeCard({ programme }: { programme: Programme }) {
  const { icon: Icon } = programme;
  const isFree = programme.priceCents === null;
  const href = paths.courseDetail(programme.slug);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg">
      {/* ------------------------------------------------------------ media */}
      <div className="relative aspect-[16/10] overflow-hidden bg-primary-soft">
        {programme.thumbnailUrl ? (
          <img
            src={programme.thumbnailUrl}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          // Designed fallback rather than an empty box — see homeContent.ts.
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary-soft to-accent-soft">
            <Icon className="size-14 text-primary/25" aria-hidden="true" strokeWidth={1.25} />
          </div>
        )}

        {/*
          Badges sit on a dark scrim, not straight on the artwork: an
          admin-uploaded thumbnail can be any colour, and white-on-white is how
          a badge disappears in production but not in review.
        */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white">
            <Clock className="size-3" aria-hidden="true" />
            {programme.durationLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white">
            <Monitor className="size-3" aria-hidden="true" />
            {programme.modeLabel}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-strong">
          {programme.categoryName}
        </p>

        <h3 className="mt-1.5 text-base font-semibold leading-snug text-primary">
          <Link to={href} className="outline-none after:absolute after:inset-0 focus-visible:underline">
            {programme.title}
          </Link>
        </h3>

        {/* Clamped so a long excerpt cannot make one card taller than its row. */}
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{programme.excerpt}</p>

        <ul className="mt-3 space-y-1.5">
          {programme.highlights.slice(0, 3).map((highlight) => (
            <li key={highlight} className="flex items-start gap-1.5 text-[13px] text-muted-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
              {highlight}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
          <p className="text-sm font-semibold text-primary">
            {isFree ? 'Free' : formatMoney(programme.priceCents, programme.currency)}
          </p>

          {/*
            Presentational only — the stretched title link above is the real
            navigation, so this must stay out of the tab order and out of the
            accessibility tree rather than becoming a duplicate link.
          */}
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-primary transition-colors group-hover:text-accent-strong"
          >
            View details
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
