import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Clock, PlayCircle } from 'lucide-react';

import { formatCourseLength, formatMoney } from '@shared/lib/formatters';
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
export function ProgrammeCard({
  programme,
  badge,
}: {
  programme: Programme;
  /**
   * A short label over the artwork — the catalogue passes "Enrolled" for a
   * signed-in student's own courses. Presentation only: what a student may open
   * is decided by the API, never by this.
   */
  badge?: string;
}) {
  const { t } = useTranslation();
  const { icon: Icon } = programme;
  const isFree = programme.priceCents === null;
  const href = paths.courseDetail(programme.slug);

  /*
   * Both chips are real facts and both can legitimately be absent: a course with
   * no lessons uploaded yet has nothing to count, and a course whose lessons
   * have no duration recorded sums to 0. Each is hidden rather than drawn as
   * "0 lessons" or "0m", which reads as a broken card rather than an empty one.
   */
  const durationLabel =
    programme.durationSeconds > 0 ? formatCourseLength(programme.durationSeconds) : null;
  const lessonsLabel =
    programme.lessonsCount > 0 ? t('courses.lessonCount', { count: programme.lessonsCount }) : null;

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

        {badge ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[11px] font-semibold text-success-foreground shadow-sm">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            {badge}
          </span>
        ) : null}

        {/*
          Badges sit on a dark scrim, not straight on the artwork: an
          admin-uploaded thumbnail can be any colour, and white-on-white is how
          a badge disappears in production but not in review.
        */}
        {(durationLabel || lessonsLabel) && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
            {durationLabel ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white">
                <Clock className="size-3" aria-hidden="true" />
                {durationLabel}
              </span>
            ) : (
              <span />
            )}
            {lessonsLabel ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white">
                <PlayCircle className="size-3" aria-hidden="true" />
                {lessonsLabel}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-strong">
          {programme.categoryName}
        </p>

        <h3 className="mt-1.5 text-base font-semibold leading-snug text-primary">
          <Link to={href} className="outline-none after:absolute after:inset-0 focus-visible:underline">
            {programme.name}
          </Link>
        </h3>

        {/*
          Clamped so a long excerpt cannot make one card taller than its row, and
          omitted entirely when the course has no description yet — an empty
          paragraph still occupies two lines, which reads as content that failed
          to load rather than content that was never written.
        */}
        {programme.excerpt !== '' && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {programme.excerpt}
          </p>
        )}

        {/*
          The three ticked topic-title bullets that used to sit here were removed
          at the client's request (2026-09-25). The card is now artwork, category,
          title, excerpt and price. Do not reinstate them without asking; the
          topic titles are still in the payload for `PUB-4`'s detail page.
        */}

        {/* Pushes the price row to the bottom so cards in a row line up even
            when one has no excerpt and the next has a two-line title. */}
        <div className="flex-1" />

        <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
          {/*
            A bundle-only course has a price that nobody can pay on its own, so
            printing it would be an offer we do not make. The backend enforces
            the same rule on the enrol endpoint; this is only what is drawn.
          */}
          <p className="text-sm font-semibold text-primary">
            {isFree
              ? t('courses.free')
              : programme.soldIndividually
                ? formatMoney(programme.priceCents, programme.currency)
                : t('site.catalogue.inBundle')}
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
            {t('site.catalogue.viewDetails')}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
