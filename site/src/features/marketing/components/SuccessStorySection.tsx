import { useTranslation } from 'react-i18next';
import { Check, Quote } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Container } from '@/components/shared/Container';
import { EmptyState } from '@/components/shared/EmptyState';
import { YouTubeFacade } from '@/components/shared/YouTubeFacade';
import { youTubeVideoId } from '@/lib/youtube';
import type { SuccessStory } from '@/features/marketing/homeContent';

/**
 * One success story, told as a video beside the student's own words.
 *
 * **Why this section is navy while the two above it are light.** The page runs
 * hero (navy) → highlights (white) → programmes (white) → community (grey), and
 * a fourth pale band would let a scrolling visitor slide straight past the most
 * persuasive thing on the page. Dark also flatters video: a bright frame on a
 * white page reads as a stray image, where the same frame on navy reads as a
 * screen. The heavy lifting is done by contrast, not by another accent colour.
 *
 * **The video sits on the left**, reversing the hero and community bands, which
 * both run text-left/media-right. Three identical splits in a row is what makes
 * a long page feel like a template.
 *
 * Layout is `lg:grid-cols-12`, 7/5 rather than 6/6 — a 16:9 frame needs the
 * width to stay watchable, and the text column is a quote plus a short
 * paragraph, which reads better narrow than wide.
 */
export function SuccessStorySection({ id, stories }: { id?: string; stories: SuccessStory[] }) {
  const { t } = useTranslation();
  const story = stories[0];

  if (!story) {
    return (
      <section id={id} className="scroll-mt-20 bg-surface py-16 sm:py-20">
        <Container>
          <EmptyState
            className="border-surface-border text-surface-foreground"
            title={t('site.story.emptyTitle')}
            body={t('site.story.emptyBody')}
          />
        </Container>
      </section>
    );
  }

  // Null when the admin has not added a link yet, or pasted something that is
  // not a YouTube URL. Either way the story still stands on its own.
  const videoId = youTubeVideoId(story.videoUrl);

  const initials = story.studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <section id={id} className="relative scroll-mt-20 overflow-hidden bg-surface py-16 text-surface-foreground sm:py-20">
      {/* Decorative wash, mirrored from the hero so the two navy bands rhyme. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 bottom-0 size-[30rem] rounded-full bg-accent/10 blur-3xl"
      />

      <Container className="relative">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-surface-border bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            {t('site.nav.successStories')}
          </span>

          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t('site.story.heading')}</h2>
        </div>

        <div className="mt-10 grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* ------------------------------------------------------- video */}
          <div className="lg:col-span-7">
            {videoId ? (
              <YouTubeFacade
                videoId={videoId}
                posterUrl={story.videoPosterUrl}
                durationLabel={story.videoDurationLabel}
                title={t('site.story.videoTitle', { name: story.studentName })}
                className="border border-surface-border shadow-2xl"
              />
            ) : (
              /*
               * No link yet. A designed panel rather than a hidden column —
               * collapsing to one column would silently change the whole
               * section's layout the moment an admin cleared the field.
               */
              <div className="flex aspect-video items-center justify-center rounded-2xl border border-surface-border bg-white/5">
                <Quote className="size-16 text-accent/30" aria-hidden="true" strokeWidth={1.25} />
              </div>
            )}
          </div>

          {/* ------------------------------------------------------- story */}
          <div className="lg:col-span-5">
            <Quote
              aria-hidden="true"
              className="size-9 fill-accent/20 text-accent/20"
              strokeWidth={1.5}
            />

            {/*
              A real <blockquote> with <cite>, not a styled <p>. The quotation
              and its attribution are the section's actual content, and the
              markup should say so — it is what lets a screen reader announce
              where the words came from.
            */}
            <blockquote className="mt-3">
              <p className="text-xl font-semibold leading-snug sm:text-2xl">{story.quote}</p>

              <footer className="mt-6 flex items-center gap-3">
                <Avatar className="size-12 border border-surface-border">
                  {story.studentPhotoUrl ? <AvatarImage src={story.studentPhotoUrl} alt="" /> : null}
                  <AvatarFallback className="bg-white/10 text-sm text-surface-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <cite className="block text-sm font-semibold not-italic text-surface-foreground">
                    {story.studentName}
                  </cite>
                  <span className="text-[13px] text-surface-muted">
                    {story.role} · {story.year}
                  </span>
                </div>
              </footer>
            </blockquote>

            <p className="mt-6 text-[15px] leading-relaxed text-surface-muted">{story.body}</p>

            {story.results.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {story.results.map((result) => (
                  <li
                    key={result}
                    className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-white/5 px-3 py-1.5 text-[13px] font-medium"
                  >
                    <Check className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                    {result}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
