import { sectionIds } from '@/components/layout/siteNav';
import { HeroSlider } from '@/features/marketing/components/HeroSlider';
import { HeroHighlights } from '@/features/marketing/components/HeroHighlights';
import { ProgrammesSection } from '@/features/marketing/components/ProgrammesSection';
import { CommunitySection } from '@/features/marketing/components/CommunitySection';
import { TestimonialsSection } from '@/features/marketing/components/TestimonialsSection';
import { TeamSection } from '@/features/marketing/components/TeamSection';
import {
  featuredProgrammes,
  heroHighlights,
  heroSlides,
  teamMembers,
  testimonials,
} from '@/features/marketing/homeContent';

/**
 * The home page.
 *
 * Sections are composed here in a fixed order for now. `PUB-1`/`PUB-2` replace
 * this list with the section registry driven by `GET public/site-content`, so
 * the admin controls the order and which sections appear — which is why each
 * section below takes its content as props and its anchor id as a prop, rather
 * than hardcoding either.
 */
export function HomePage() {
  return (
    <>
      <HeroSlider slides={heroSlides} />
      <HeroHighlights items={heroHighlights} />

      <ProgrammesSection programmes={featuredProgrammes} />

      {/* About Us, in the "Join 500+" treatment from the client's reference. */}
      <CommunitySection id={sectionIds.about} />

      {/*
        Success stories is HIDDEN FOR NOW (client instruction, 2026-09-25) — not
        deleted. `SuccessStorySection` and its `successStories` data are complete
        and stay in the tree, because `CMS-3` makes section visibility an admin
        setting and this becomes a toggle rather than a code change.

        Re-enabling it means four things, not one: render it here, put
        `successStories` back in `publicNav` (siteNav.ts), point the testimonials
        CTA back at `/#success-stories`, and restore the hero's second-slide
        secondary CTA in homeContent.ts. All four are marked in place.
      */}
      <TestimonialsSection id={sectionIds.testimonials} testimonials={testimonials} />

      {/* Replaced the FAQ placeholder at the client's request (2026-09-25). */}
      <TeamSection id={sectionIds.team} members={teamMembers} />
    </>
  );
}
