import { sectionIds } from '@/components/layout/siteNav';
import { HeroSlider } from '@/features/marketing/components/HeroSlider';
import { ProgrammesSection } from '@/features/marketing/components/ProgrammesSection';
import { CommunitySection } from '@/features/marketing/components/CommunitySection';
import { TestimonialsSection } from '@/features/marketing/components/TestimonialsSection';
import { TeamSection } from '@/features/marketing/components/TeamSection';
import { useSiteContent } from '@/features/marketing/useSiteContent';
import { useHomePageCourses } from '@/features/marketing/usePublicCourses';
import { testimonials } from '@/features/marketing/homeContent';

/**
 * The home page.
 *
 * The hero, the About band and the team come from the admin panel via
 * `useSiteContent` — which also supplies the designed fallbacks, so this
 * component never has to reason about loading or failure. There is deliberately
 * no spinner: a marketing page renders its content on the first paint and
 * swaps in the admin's version when it arrives.
 *
 * **The programmes carousel is the one section that shows a loading state**, and
 * on purpose: it has no fallback, because inventing a course would be inventing
 * a product with a price on it. It renders card-shaped skeletons instead, sized
 * so the section does not change height when the real courses land.
 *
 * `testimonials` is still hardcoded and is replaced by a later CMS task.
 * Sections are composed here in a fixed order; `PUB-2` replaces this list with
 * the section registry, which is why each one takes its content **and its anchor
 * id** as props rather than hardcoding either.
 */
export function HomePage() {
  const { heroSlides, community, team } = useSiteContent();
  const { programmes, isLoading: coursesLoading } = useHomePageCourses();

  return (
    <>
      {/*
        The four-card reassurance strip that used to sit here ("Built for the
        UAE", "English and Sinhala", "Verified guidance", "Assessed, not just
        watched") was REMOVED at the client's request, 2026-09-25 — deleted
        rather than hidden, unlike Success stories below, because that section is
        finished work waiting on an admin toggle and this was placeholder copy
        the client never approved. `git` has it if it is ever wanted back.
      */}
      <HeroSlider slides={heroSlides} />

      {/*
        **Programmes sits directly under the hero, About Us below it** (client
        instruction, 2026-09-25). The two were swapped briefly the same day and
        swapped back, so this order is deliberate rather than incidental — the
        courses are what the hero's buttons point at, and putting the company
        story between the two separates a call to action from what it calls.
      */}
      <ProgrammesSection programmes={programmes} isLoading={coursesLoading} />

      {/* About Us, in the "Join 500+" treatment from the client's reference. */}
      <CommunitySection id={sectionIds.about} community={community} />

      {/*
        Success stories is HIDDEN FOR NOW (client instruction, 2026-09-25) — not
        deleted. `SuccessStorySection` and its `successStories` data are complete
        and stay in the tree, because a later CMS task makes section visibility an
        admin setting and this becomes a toggle rather than a code change.

        Re-enabling it means four things, not one: render it here, put
        `successStories` back in `publicNav` (siteNav.ts), point the testimonials
        CTA back at `/#success-stories`, and restore the hero's second-slide
        secondary CTA in homeContent.ts. All four are marked in place.
      */}
      <TestimonialsSection id={sectionIds.testimonials} testimonials={testimonials} />

      {/* Replaced the FAQ placeholder at the client's request (2026-09-25).
          Empty until the client adds people in Website Configuration > The Team;
          the section draws its own "coming soon" state until then. */}
      <TeamSection id={sectionIds.team} members={team} />
    </>
  );
}
