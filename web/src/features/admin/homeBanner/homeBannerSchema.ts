import { z } from 'zod';
import type { HomeBannerLinkType } from '@shared/types/homeBanner';

/**
 * UX validation for the Home banner form. The backend
 * (`SaveHomeBannerRequest`) is the enforcement point — this exists so the admin
 * sees the problem before saving, and the two are kept deliberately in step.
 */
export const homeBannerFormSchema = z
  .object({
    title: z.string().max(120, 'Keep the headline under 120 characters.'),
    subtitle: z.string().max(200, 'Keep the supporting line under 200 characters.'),
    link_type: z.enum(['none', 'courses', 'checklists', 'course', 'url']),
    /** '' while nothing is chosen — a Select cannot hold null. */
    link_course_programme_id: z.string(),
    link_url: z.string().max(2048, 'That web address is too long.'),
    is_active: z.boolean(),
  })
  // Each link type needs its own target, which a per-field rule cannot express.
  // Mirrors the Form Request's `after()` hook.
  .superRefine((values, ctx) => {
    if (values.link_type === 'course' && values.link_course_programme_id === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['link_course_programme_id'],
        message: 'Choose the course this banner opens.',
      });
    }

    if (values.link_type === 'url') {
      if (values.link_url.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['link_url'],
          message: 'Enter the web address this banner opens.',
        });

        return;
      }

      if (!/^https?:\/\/\S+$/i.test(values.link_url.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['link_url'],
          message: 'Enter a full web address starting with http:// or https://.',
        });
      }
    }
  });

export type HomeBannerFormSchema = z.infer<typeof homeBannerFormSchema>;

export interface HomeBannerLinkOption {
  value: HomeBannerLinkType;
  label: string;
  /** What the student experiences, in the admin's words. */
  hint: string;
}

export const HOME_BANNER_LINKS: readonly HomeBannerLinkOption[] = [
  { value: 'none', label: 'Nothing', hint: 'The banner is signage only — tapping it does nothing.' },
  { value: 'courses', label: 'Courses tab', hint: 'Opens the student’s Courses tab.' },
  { value: 'checklists', label: 'Checklists tab', hint: 'Opens the Before / After Arrival checklists.' },
  { value: 'course', label: 'A specific course', hint: 'Opens one course. It must be published.' },
  { value: 'url', label: 'A web page', hint: 'Opens the page inside the app’s browser.' },
];
