import { z } from 'zod';
import type { SiteHeroIcon, SiteLinkTarget } from '@shared/types/siteContent';

/**
 * UX validation for Website Configuration.
 *
 * The backend (`SaveSiteHeroSlideRequest`, `SaveTeamMemberRequest`,
 * `UpdateWebsiteContentRequest`) is the enforcement point — these exist so the
 * admin sees the problem before saving, and the two are kept deliberately in
 * step (root CLAUDE.md §8).
 */

/**
 * `**word**` marks the gold segment of a heading. An odd number of markers
 * leaves one unclosed, and the website prints the asterisks literally — a
 * mistake the admin would otherwise only find by looking at the live page.
 * Mirrors the Form Requests' `after()` hooks.
 */
function hasBalancedHighlight(value: string): boolean {
  return (value.split('**').length - 1) % 2 === 0;
}

const HIGHLIGHT_MESSAGE = 'Highlighted words need ** on both sides, like **this**.';

/** One button. `''` is what a `Select` holds while nothing is chosen. */
const ctaFields = {
  label: z.string().max(40, 'Keep the button wording under 40 characters.'),
  label_si: z.string().max(40, 'Keep the button wording under 40 characters.'),
  target: z.enum([
    'none',
    'home',
    'courses',
    'about',
    'testimonials',
    'team',
    'contact',
    'course',
    'url',
  ]),
  course_id: z.string(),
  url: z.string().max(2048, 'That web address is too long.'),
};

/**
 * Each button needs a label and, for two of the nine targets, its own
 * destination. None of that is expressible per-field.
 */
function refineCta(
  values: HeroSlideFormSchema,
  ctx: z.RefinementCtx,
  slot: 'primary' | 'secondary',
) {
  const target = values[`${slot}_cta_target`];
  if (target === 'none') return;

  if (values[`${slot}_cta_label`].trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${slot}_cta_label`],
      message: 'Enter the wording for this button, or set it to show no button.',
    });
  }

  if (target === 'course' && values[`${slot}_cta_course_programme_id`] === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [`${slot}_cta_course_programme_id`],
      message: 'Choose the course this button opens.',
    });
  }

  if (target === 'url') {
    const url = values[`${slot}_cta_url`].trim();

    if (url === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [`${slot}_cta_url`],
        message: 'Enter the web address this button opens.',
      });

      return;
    }

    if (!/^https?:\/\/\S+$/i.test(url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [`${slot}_cta_url`],
        message: 'Enter a full web address starting with http:// or https://.',
      });
    }
  }
}

export const heroSlideFormSchema = z
  .object({
    eyebrow: z.string().max(60, 'Keep the label under 60 characters.'),
    eyebrow_si: z.string().max(60, 'Keep the label under 60 characters.'),
    heading: z
      .string()
      .min(1, 'Enter the headline for this slide.')
      .max(120, 'Keep the headline under 120 characters.')
      .refine(hasBalancedHighlight, HIGHLIGHT_MESSAGE),
    heading_si: z
      .string()
      .max(120, 'Keep the headline under 120 characters.')
      .refine(hasBalancedHighlight, HIGHLIGHT_MESSAGE),
    body: z.string().max(300, 'Keep the paragraph under 300 characters.'),
    body_si: z.string().max(300, 'Keep the paragraph under 300 characters.'),

    primary_cta_label: ctaFields.label,
    primary_cta_label_si: ctaFields.label_si,
    primary_cta_target: ctaFields.target,
    primary_cta_course_programme_id: ctaFields.course_id,
    primary_cta_url: ctaFields.url,

    secondary_cta_label: ctaFields.label,
    secondary_cta_label_si: ctaFields.label_si,
    secondary_cta_target: ctaFields.target,
    secondary_cta_course_programme_id: ctaFields.course_id,
    secondary_cta_url: ctaFields.url,

    stat_one_value: z.string().max(12, 'Keep this short — "500+" or "1:1".'),
    stat_one_label: z.string().max(24, 'Keep the label under 24 characters.'),
    stat_one_label_si: z.string().max(24, 'Keep the label under 24 characters.'),
    stat_two_value: z.string().max(12, 'Keep this short — "500+" or "1:1".'),
    stat_two_label: z.string().max(24, 'Keep the label under 24 characters.'),
    stat_two_label_si: z.string().max(24, 'Keep the label under 24 characters.'),

    icon: z.enum([
      'education',
      'career',
      'travel',
      'community',
      'language',
      'documents',
      'support',
      'achievement',
    ]),
    is_visible: z.boolean(),
  })
  .superRefine((values, ctx) => {
    refineCta(values, ctx, 'primary');
    refineCta(values, ctx, 'secondary');

    /*
     * A figure with no number is an empty white card floating over the
     * artwork. The server drops the pair rather than rejecting it, so this is
     * only here to stop the admin typing a label and wondering where it went.
     */
    for (const slot of ['one', 'two'] as const) {
      const value = values[`stat_${slot}_value`].trim();
      const label = values[`stat_${slot}_label`].trim();

      if (value === '' && label !== '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`stat_${slot}_value`],
          message: 'Enter the figure, or clear the label — a label alone is not shown.',
        });
      }
    }
  });

export type HeroSlideFormSchema = z.infer<typeof heroSlideFormSchema>;

export const teamMemberFormSchema = z.object({
  name: z.string().min(1, 'Enter this person’s name.').max(120, 'That name is too long.'),
  role: z.string().max(120, 'Keep the job title under 120 characters.'),
  role_si: z.string().max(120, 'Keep the job title under 120 characters.'),
  is_visible: z.boolean(),
});

export type TeamMemberFormSchema = z.infer<typeof teamMemberFormSchema>;

export const websiteContentFormSchema = z.object({
  community_eyebrow: z.string().max(60, 'Keep the label under 60 characters.'),
  community_eyebrow_si: z.string().max(60, 'Keep the label under 60 characters.'),
  community_heading: z
    .string()
    .max(160, 'Keep the heading under 160 characters.')
    .refine(hasBalancedHighlight, HIGHLIGHT_MESSAGE),
  community_heading_si: z
    .string()
    .max(160, 'Keep the heading under 160 characters.')
    .refine(hasBalancedHighlight, HIGHLIGHT_MESSAGE),
  community_body: z.string().max(1000, 'Keep the paragraph under 1000 characters.'),
  community_body_si: z.string().max(1000, 'Keep the paragraph under 1000 characters.'),
  /*
   * Only shape-checked here. Whether it is really a YouTube link is decided by
   * the server, against a host allowlist — a regex in a browser bundle is not
   * where that belongs, and the website parses it a third time before it ever
   * reaches an iframe.
   */
  community_video_url: z.string().max(2048, 'That web address is too long.'),
  community_video_duration_label: z
    .string()
    .refine(
      (value) => value.trim() === '' || /^\d{1,2}:\d{2}$/.test(value.trim()),
      'Write the length as minutes and seconds, like 1:58.',
    ),
  community_floating_label: z.string().max(60, 'Keep the label under 60 characters.'),
  community_floating_label_si: z.string().max(60, 'Keep the label under 60 characters.'),
});

export type WebsiteContentFormSchema = z.infer<typeof websiteContentFormSchema>;

export interface SiteLinkOption {
  value: SiteLinkTarget;
  label: string;
  /** What the visitor experiences, in the admin's words. */
  hint: string;
}

/**
 * The nine destinations a button may have. A fixed list, never a typed path —
 * see `App\Enums\SiteLinkTarget` for why.
 */
export const SITE_LINK_TARGETS: readonly SiteLinkOption[] = [
  { value: 'none', label: 'No button', hint: 'This button is not shown at all.' },
  { value: 'home', label: 'Home page', hint: 'Back to the top of the website.' },
  { value: 'courses', label: 'Courses page', hint: 'The full course catalogue.' },
  { value: 'about', label: 'About Us section', hint: 'Scrolls down to About Us on the home page.' },
  {
    value: 'testimonials',
    label: 'Our Values section',
    hint: 'Scrolls down to Our Values on the home page.',
  },
  { value: 'team', label: 'The Team section', hint: 'Scrolls down to The Team on the home page.' },
  { value: 'contact', label: 'Contact', hint: 'Scrolls to the contact details in the footer.' },
  { value: 'course', label: 'A specific course', hint: 'Opens one course. It must be published.' },
  { value: 'url', label: 'Another web page', hint: 'Opens an address you enter.' },
];

export interface SiteHeroIconOption {
  value: SiteHeroIcon;
  label: string;
}

/** Shown only in the fallback panel, for a slide with wording but no artwork. */
export const SITE_HERO_ICONS: readonly SiteHeroIconOption[] = [
  { value: 'education', label: 'Education' },
  { value: 'career', label: 'Career' },
  { value: 'travel', label: 'Travel' },
  { value: 'community', label: 'Community' },
  { value: 'language', label: 'Language' },
  { value: 'documents', label: 'Documents' },
  { value: 'support', label: 'Support' },
  { value: 'achievement', label: 'Achievement' },
];
