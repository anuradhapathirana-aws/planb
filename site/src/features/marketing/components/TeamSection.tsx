import { useEffect, useState } from 'react';
import type { FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Facebook, Linkedin, type LucideIcon } from 'lucide-react';

import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EmptyState } from '@/components/shared/EmptyState';
import { CAROUSEL_ITEM_CLASSES, CAROUSEL_TRACK_CLASSES } from '@/components/shared/SnapCarousel';
import { useLoopingCarousel } from '@/components/shared/useLoopingCarousel';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/features/marketing/homeContent';

/**
 * Our Team — a row of portrait cards, each with a white name plate floating
 * over the bottom of the photograph.
 *
 * **It rotates on its own** (client instruction, 2026-09-26): one card along
 * every 3 seconds, looping forever — see `useLoopingCarousel` for how the loop
 * stays seamless. **Whole cards only**: 5 on a laptop, 3 on a tablet, 2 on a
 * phone, no half-card peek. Still no dots or arrows; the row can be swiped or
 * dragged as before.
 *
 * **It stops** while the pointer is over the row, while anything in it has
 * keyboard focus (a link must not slide away from under the Tab key), while a
 * card is tapped open on a touch screen, and **not at all** for visitors whose
 * device asks for reduced motion — they swipe instead.
 *
 * **The copies.** To loop, the members are rendered twice. The second set is
 * hidden from screen readers and its links are out of the tab order, so a
 * screen reader hears each person once and Tab never reaches a duplicate.
 */
export function TeamSection({ id, members }: { id?: string; members: TeamMember[] }) {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // The card a touch-screen visitor tapped to see its profile links.
  const [openId, setOpenId] = useState<number | null>(null);

  const { trackRef, canLoop } = useLoopingCarousel({
    itemCount: members.length,
    paused: reducedMotion || hovered || focused || openId !== null,
  });

  // A tap anywhere outside the open card closes it, which also resumes the row.
  useEffect(() => {
    if (openId === null) return;

    const close = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(`[data-member="${openId}"]`)) setOpenId(null);
    };

    document.addEventListener('pointerdown', close);

    return () => document.removeEventListener('pointerdown', close);
  }, [openId]);

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    // Focus moving between two cards is still focus inside the row.
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }

  const toggle = (member: TeamMember) => setOpenId((current) => (current === member.id ? null : member.id));

  return (
    <section id={id} className="scroll-mt-20 bg-muted/40 py-12 sm:py-14">
      <Container>
        <SectionHeading align="center" title={t('site.team.heading')} body={t('site.team.body')} />

        {members.length === 0 ? (
          <EmptyState className="mt-8" title={t('site.team.emptyTitle')} body={t('site.team.emptyBody')} />
        ) : (
          /*
            `pb-10` leaves room for the name plates, which hang half below their
            cards — without it the scroll container clips them. It came down
            from `pb-14` when the profile icons moved off the plate onto the
            photo; the two move together. `pt-2` gives the hover lift somewhere
            to go. `relative` makes the track the cards' `offsetParent`, which
            the rotation measures against.
          */
          <div
            ref={trackRef}
            className={cn(CAROUSEL_TRACK_CLASSES, 'relative mt-8 pt-2 pb-10')}
            role="list"
            aria-label={t('site.team.heading')}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={onBlur}
          >
            {members.map((member) => (
              <div key={member.id} role="listitem" className={CAROUSEL_ITEM_CLASSES['5']}>
                <TeamCard member={member} open={openId === member.id} onToggle={() => toggle(member)} />
              </div>
            ))}

            {canLoop
              ? members.map((member) => (
                  <div key={`copy-${member.id}`} aria-hidden="true" className={CAROUSEL_ITEM_CLASSES['5']}>
                    <TeamCard member={member} open={false} onToggle={() => toggle(member)} isCopy />
                  </div>
                ))
              : null}
          </div>
        )}
      </Container>
    </section>
  );
}

/**
 * One social profile icon: a white circle over the photo's dark fade (client
 * instruction, 2026-09-26: shown when a card is hovered). 36px — larger than
 * the old 32px plate icons now that they have the photo's width to sit in, and
 * clear of WCAG 2.2's 24px minimum. They are supplementary links; the card's
 * own content is never behind them.
 */
function SocialLink({
  href,
  label,
  icon: Icon,
  isCopy,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isCopy: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      // The copy in the loop is not a second stop for the Tab key.
      tabIndex={isCopy ? -1 : undefined}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full bg-white text-primary shadow-md',
        'transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary focus-visible:outline-none',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </a>
  );
}

/**
 * One team member.
 *
 * The depth in the client's reference comes from one thing: **the white name
 * plate is a separate surface floating over the photograph and hanging past its
 * bottom edge**, with its own shadow. It is not a caption inside the card and
 * it is not a gradient overlay — the overhang is what reads as three
 * dimensional, so the plate's `translate-y` and the track's bottom padding have
 * to stay in step.
 *
 * **The profile links appear over the photo** on hover, on keyboard focus, or
 * — on a touch screen, which has no hover — when the card is tapped (`open`).
 * Hidden, they take no clicks (`pointer-events-none`), so a tap on the photo
 * opens the card rather than landing on an invisible link.
 */
function TeamCard({
  member,
  open,
  onToggle,
  isCopy = false,
}: {
  member: TeamMember;
  open: boolean;
  onToggle: () => void;
  isCopy?: boolean;
}) {
  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const hasLinks = Boolean(member.facebookUrl || member.linkedinUrl);

  return (
    /*
     * A click only means "show the links", which the links themselves (and
     * hover, and focus) already cover for mouse and keyboard — so the card is
     * not a button, and a card with no links does nothing on tap.
     */
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- touch-only affordance; keyboard users reach the links directly
    <article
      className="group relative"
      data-member={member.id}
      data-open={open}
      onClick={hasLinks && !isCopy ? onToggle : undefined}
    >
      {/* 4:5 portrait on a soft backdrop, as in the reference. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-b from-secondary to-muted shadow-md ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt=""
            className="size-full object-cover object-top"
            loading="lazy"
            decoding="async"
          />
        ) : (
          /*
           * No photograph supplied. Initials on the brand navy rather than an
           * empty grey box — a row of blank rectangles reads as a loading
           * failure.
           */
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary to-primary-tint">
            <span className="text-3xl font-semibold tracking-wide text-primary-foreground">{initials}</span>
          </div>
        )}

        {/*
          Facebook and LinkedIn, both optional and independent: one link gets
          one icon, none gets no overlay at all. The addresses are restricted to
          http/https server-side in `SaveTeamMemberRequest`, which is what makes
          rendering them as anchors safe.

          `pb-9` lifts the icons clear of the name plate, whose top half sits
          over the bottom of the photo.
        */}
        {hasLinks ? (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center gap-2 pt-12 pb-9',
              'bg-gradient-to-t from-primary/90 via-primary/50 to-transparent',
              'translate-y-3 opacity-0 transition-all duration-300',
              'group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100',
              'group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100',
              'group-data-[open=true]:pointer-events-auto group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100',
            )}
          >
            {member.facebookUrl ? (
              <SocialLink
                href={member.facebookUrl}
                label={`${member.name} on Facebook`}
                icon={Facebook}
                isCopy={isCopy}
              />
            ) : null}
            {member.linkedinUrl ? (
              <SocialLink
                href={member.linkedinUrl}
                label={`${member.name} on LinkedIn`}
                icon={Linkedin}
                isCopy={isCopy}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {/*
        The floating plate. `translate-y-1/2` hangs half of it below the card;
        the track's `pb-10` is what stops that overhang being clipped.

        It is positioned against the <article>, not the card, so the card's
        hover lift does not carry it. It has to travel the same 4px itself or a
        gap opens between them: 50% down, minus 4px on hover.
      */}
      <div className="absolute inset-x-2 bottom-0 translate-y-1/2 rounded-lg bg-card px-2 py-2.5 text-center shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:translate-y-[calc(50%-0.25rem)] sm:inset-x-3 sm:px-3">
        {/*
          Tight insets and a small type scale: at five across the card is only
          ~190px wide, and a plate inset 16px a side would truncate most real
          names. `tracking-wide` on 12px uppercase keeps it legible at that size.
        */}
        <h3 className="truncate text-xs font-bold tracking-wide text-primary uppercase sm:text-[13px]">
          {member.name}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground italic">{member.role}</p>
      </div>
    </article>
  );
}
