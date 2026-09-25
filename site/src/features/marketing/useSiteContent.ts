import { useQuery } from '@tanstack/react-query';

import { fetchSiteContent } from '@/api/siteContent.api';
import { SITE_HERO_ICON_GLYPHS } from '@/features/marketing/heroIcons';
import { resolveSiteCta } from '@/features/marketing/siteLinks';
import {
  community as fallbackCommunity,
  heroSlides as fallbackHeroSlides,
  type CommunityContent,
  type HeroSlide,
  type TeamMember,
} from '@/features/marketing/homeContent';
import type {
  PublicCommunity,
  PublicHeroSlide,
  PublicTeamMember,
} from '@shared/types/siteContent';

export const siteContentKeys = {
  all: ['site-content'] as const,
};

/**
 * The home page's admin-managed content, adapted to what the sections render.
 *
 * Three decisions worth knowing before changing this:
 *
 * **1. The hero and the About band fall back; the team does not.** An empty hero
 * or an empty About band uses the designed defaults in `homeContent.ts`, because
 * Plan B's front page is the company's shopfront and "the admin hid every slide"
 * must not leave a hole in it. **The team is different**: a section headed "The
 * Team" is a claim about real people, so an empty table renders
 * `TeamSection`'s own "coming soon" state rather than invented colleagues.
 *
 * **2. It never suspends the page.** The fallbacks mean the first render already
 * has content, so the hero paints immediately and is replaced in place when the
 * real slides arrive. A spinner where the `<h1>` belongs is the worst possible
 * loading state for a marketing page — and for a prerender pass (`FND-5`),
 * which captures whatever the first render produced.
 *
 * **3. A failure is silent.** `retry` is low and there is no toast: a visitor
 * who cannot reach the API should see Plan B's designed home page, not an error
 * about content loading. The admin finds out from the admin panel.
 */
export function useSiteContent() {
  const query = useQuery({
    queryKey: siteContentKeys.all,
    queryFn: fetchSiteContent,
    /*
     * Content changes when an admin edits it, which is rare. Five minutes keeps
     * a visitor clicking around the site from refetching the same payload on
     * every navigation back to the home page.
     */
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const data = query.data;

  const heroSlides =
    data && data.hero_slides.length > 0
      ? data.hero_slides.map(toHeroSlide)
      : fallbackHeroSlides;

  const community = data ? toCommunity(data.community) : fallbackCommunity;

  // Empty until the API answers, and empty is a valid answer. `TeamSection`
  // draws its own "coming soon" state — see the note above.
  const team = data?.team.map(toTeamMember) ?? [];

  return { heroSlides, community, team, isLoading: query.isLoading };
}

/* -------------------------------------------------------------------------- */

function toHeroSlide(slide: PublicHeroSlide): HeroSlide {
  return {
    id: String(slide.id),
    eyebrow: slide.eyebrow ?? '',
    // The API only publishes slides that have one, so this is belt and braces.
    heading: slide.heading ?? '',
    body: slide.body ?? '',
    primaryCta: resolveSiteCta(slide.primary_cta),
    secondaryCta: resolveSiteCta(slide.secondary_cta),
    imageUrl: slide.image_url,
    // A lookup in a fixed map, never a component built from the stored string.
    icon: SITE_HERO_ICON_GLYPHS[slide.icon] ?? SITE_HERO_ICON_GLYPHS.education,
    stats: slide.stats,
  };
}

/**
 * Field by field, falling back per field rather than all-or-nothing: an admin
 * who has written the heading but not the paragraph should see their heading
 * with the designed paragraph under it, not have their heading ignored.
 */
function toCommunity(community: PublicCommunity): CommunityContent {
  return {
    eyebrow: community.eyebrow ?? fallbackCommunity.eyebrow,
    heading: community.heading ?? fallbackCommunity.heading,
    body: community.body ?? fallbackCommunity.body,
    // Not defaulted: there is no fallback video, deliberately. With no link the
    // section draws its designed panel, which is the correct empty state.
    videoUrl: community.video_url,
    videoPosterUrl: community.video_poster_url,
    videoDurationLabel: community.video_duration_label,
    icon: fallbackCommunity.icon,
    floatingLabel: community.floating_label ?? fallbackCommunity.floatingLabel,
  };
}

function toTeamMember(member: PublicTeamMember): TeamMember {
  return {
    id: member.id,
    name: member.name,
    role: member.role ?? '',
    photoUrl: member.photo_url,
    facebookUrl: member.facebook_url,
    linkedinUrl: member.linkedin_url,
  };
}
