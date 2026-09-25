import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/shared/Container';
import { Highlight } from '@/components/shared/Highlight';
import { YouTubeFacade } from '@/components/shared/YouTubeFacade';
import { youTubeVideoId } from '@shared/lib/youtube';
import { paths } from '@/routes/paths';
import type { CommunityContent } from '@/features/marketing/homeContent';

/**
 * About Us, in the "Join 500+ Students" treatment: copy on the left, a video
 * with a floating status pill on the right.
 *
 * Content comes in as a prop — it is admin-managed (Website Configuration >
 * About Video) and reaches this component through `useSiteContent`, which also
 * supplies the designed defaults for any field the admin has left blank. This
 * component never reaches for content itself, so the same markup serves live
 * copy and the fallback.
 *
 * The four numbered proof cards this once carried were **removed at the
 * client's request (2026-09-25)**, along with their `points` data. The column
 * is now a chip, a heading, a paragraph and one call to action — which balances
 * the 16:9 video beside it closely enough that `items-center` does the rest.
 * Do not reinstate them without asking.
 */
export function CommunitySection({
  id,
  community,
}: {
  id?: string;
  community: CommunityContent;
}) {
  const { t } = useTranslation();
  const Icon = community.icon;
  // Null when no link is set, or when it is not a YouTube URL. `youTubeVideoId`
  // is the validation boundary — never pass a raw admin value to an iframe.
  const videoId = youTubeVideoId(community.videoUrl);

  /*
   * The band keeps its existing tint at the top and fades out to the page's own
   * white by the bottom (client instruction, 2026-09-25). `to-background`
   * rather than `to-white` — it has to resolve to whatever surface the page is
   * actually using, not a hardcoded colour.
   *
   * `via-muted/30` holds the tint through the upper half instead of letting a
   * two-stop gradient wash it out immediately, so the section still reads as a
   * distinct band rather than as a faint smudge.
   */
  return (
    <section
      id={id}
      className="scroll-mt-20 bg-gradient-to-b from-muted/50 via-muted/30 to-background py-12 sm:py-14"
    >
      <Container className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
        {/* ------------------------------------------------------------ copy */}
        <div>
          <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-strong">
            {community.eyebrow}
          </span>

          <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-primary sm:text-3xl">
            <Highlight text={community.heading} />
          </h2>

          {/* Slightly larger than the default body size: with the proof cards
              gone this paragraph carries the section on its own. */}
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {community.body}
          </p>

          <Button asChild size="lg" className="mt-6">
            <Link to={paths.courses}>
              Start learning
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* ---------------------------------------------------------- video */}
        <div className="relative">
          {videoId ? (
            <YouTubeFacade
              videoId={videoId}
              posterUrl={community.videoPosterUrl}
              durationLabel={community.videoDurationLabel}
              title={t('site.community.videoTitle')}
              className="border shadow-xl"
            />
          ) : (
            /*
             * No link set. A designed panel rather than a collapsed column —
             * clearing the field in the admin must not silently restructure the
             * whole section.
             */
            <div className="flex aspect-video items-center justify-center rounded-2xl border bg-gradient-to-br from-primary-soft to-accent-soft">
              <Icon className="size-20 text-primary/25" aria-hidden="true" strokeWidth={1.25} />
            </div>
          )}

          {/*
            The floating pill. It overhangs the video's bottom-left corner on a
            large screen, where there is room outside the grid column; on a
            phone it tucks inside instead, because an overhanging element at
            360px pushes a horizontal scrollbar onto the whole page.

            `pointer-events-none` so it does not punch a dead spot in the play
            button underneath it — the whole facade is one big button, and a
            decorative badge must not eat clicks aimed at it.
          */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-background px-4 py-2 shadow-lg lg:-left-6 lg:bottom-6">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="text-xs font-semibold text-foreground">{community.floatingLabel}</span>
          </div>
        </div>
      </Container>
    </section>
  );
}
