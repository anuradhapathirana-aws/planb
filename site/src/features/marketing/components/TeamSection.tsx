import { useTranslation } from 'react-i18next';
import { Facebook, Linkedin, type LucideIcon } from 'lucide-react';

import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EmptyState } from '@/components/shared/EmptyState';
import { CAROUSEL_ITEM_CLASSES, CAROUSEL_TRACK_CLASSES } from '@/components/shared/SnapCarousel';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/features/marketing/homeContent';

/**
 * Our Team — a paged carousel of portrait cards, each with a white name plate
 * floating over the bottom of the photograph.
 *
 * **No page dots and no arrows** (client instruction, 2026-09-25): the row is
 * swiped on a phone and dragged or scrolled on a laptop, so `useSnapCarousel`
 * is not used here at all — nothing measures the strip because nothing reports
 * its position. `ProgrammesSection` still uses the hook for its arrows; bring it
 * back here the moment this section grows a control of its own.
 */
export function TeamSection({ id, members }: { id?: string; members: TeamMember[] }) {
  const { t } = useTranslation();

  return (
    <section id={id} className="scroll-mt-20 bg-muted/40 py-12 sm:py-14">
      <Container>
        <SectionHeading align="center" title={t('site.team.heading')} body={t('site.team.body')} />

        {members.length === 0 ? (
          <EmptyState className="mt-8" title={t('site.team.emptyTitle')} body={t('site.team.emptyBody')} />
        ) : (
          <>
            {/*
              `pb-14` leaves room for the name plates, which hang half below
              their cards — without it the plates are clipped by the scroll
              container. It went up a step from `pb-12` when the profile icons
              made the plate taller, so half of it now hangs further; these two
              move together. `pt-2` gives the hover lift somewhere to go.
            */}
            <div
              className={cn(CAROUSEL_TRACK_CLASSES, 'mt-8 pb-14 pt-2')}
              role="list"
              aria-label={t('site.team.heading')}
            >
              {/* Five across with a half-card peek — the width maths, and why
                  the half card matters, are in `CAROUSEL_ITEM_CLASSES`. */}
              {members.map((member) => (
                <div key={member.id} role="listitem" className={CAROUSEL_ITEM_CLASSES['5.5']}>
                  <TeamCard member={member} />
                </div>
              ))}
            </div>

            {/*
              No page dots (client instruction, 2026-09-25) — the row is swiped
              or dragged. They also carried 44px of touch target, which was most
              of the gap between the last name plate and the footer.
            */}
          </>
        )}
      </Container>
    </section>
  );
}

/**
 * One social profile icon: a circular outlined button (client instruction,
 * 2026-09-26). The ring is what makes it read as something to press — on a white
 * plate a bare grey glyph looks like a label, not a link.
 *
 * 32px rather than the house 44px minimum (root CLAUDE.md §8), deliberately: the
 * card is ~200px wide at five across and a 44px control would force the name
 * plate to eat a third of the portrait. 32px still clears WCAG 2.2's 24px target
 * minimum with room to spare, and these are supplementary links — the card's
 * own content is not behind them.
 *
 * `border` + `rounded-full`, not `ring`: the border takes part in layout, so the
 * two circles cannot overlap each other or the plate's own edge, and the focus
 * ring stays available to mean focus.
 */
function SocialLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className={cn(
        // Brand navy ring, with the glyph in the same navy: a navy circle around
        // a grey icon reads as two unrelated decisions. Hover fills the circle.
        'inline-flex size-8 items-center justify-center rounded-full border border-primary text-primary',
        'transition-colors hover:bg-primary hover:text-primary-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
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
 */
function TeamCard({ member }: { member: TeamMember }) {
  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <article className="group relative">
      {/* 4:5 portrait on a soft backdrop, as in the reference. */}
      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-b from-secondary to-muted shadow-md ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
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
           * No photographs supplied yet. Initials on the brand navy rather than
           * an empty grey box — a row of blank rectangles reads as a loading
           * failure. `CMS-4` swaps in real portraits.
           */
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary to-primary-tint">
            <span className="text-3xl font-semibold tracking-wide text-primary-foreground">{initials}</span>
          </div>
        )}
      </div>

      {/*
        The floating plate. `translate-y-1/2` hangs half of it below the card;
        the track's `pb-16` is what stops that overhang being clipped.
      */}
      {/*
        The plate is positioned against the <article>, not the card, so the
        card's hover lift does not carry it. It has to travel the same 4px
        itself or a gap opens between them: 50% down, minus 4px on hover.
      */}
      <div className="absolute inset-x-2 bottom-0 translate-y-1/2 rounded-lg bg-card px-2 py-2.5 text-center shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:translate-y-[calc(50%-0.25rem)] sm:inset-x-3 sm:px-3">
        {/*
          Tight insets and a small type scale: at five across the card is only
          ~200px wide, and a plate inset 16px a side would truncate most real
          names. `tracking-wide` on 12px uppercase keeps it legible at that size.
        */}
        <h3 className="truncate text-xs font-bold uppercase tracking-wide text-primary sm:text-[13px]">
          {member.name}
        </h3>
        <p className="mt-0.5 truncate text-[11px] italic text-muted-foreground">{member.role}</p>

        {/*
          Facebook and LinkedIn, under the job title (client instruction,
          2026-09-25). Both optional and independent: a person with one link
          gets one icon, a person with neither gets no row at all rather than
          greyed-out placeholders for accounts that do not exist.

          The addresses are restricted to http/https server-side, in
          `SaveTeamMemberRequest` — that is what makes rendering them as anchors
          safe. `rel="noreferrer noopener"` because they leave our origin, and
          `stopPropagation` is not needed here: unlike the course card, nothing
          wraps this card in a link for these to fight with.
        */}
        {(member.facebookUrl || member.linkedinUrl) && (
          <div className="mt-1.5 flex items-center justify-center gap-1">
            {member.facebookUrl ? (
              <SocialLink
                href={member.facebookUrl}
                label={`${member.name} on Facebook`}
                icon={Facebook}
              />
            ) : null}
            {member.linkedinUrl ? (
              <SocialLink
                href={member.linkedinUrl}
                label={`${member.name} on LinkedIn`}
                icon={Linkedin}
              />
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
