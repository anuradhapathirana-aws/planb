import type { CourseCategoryIconName } from './course';

/**
 * A course as a card on the public website.
 *
 * Mirrors `backend/app/Http/Resources/Public/PublicCourseSummaryResource.php`.
 *
 * **Deliberately not `StudentCourseSummary`.** That type carries `is_enrolled`,
 * `is_wishlisted`, `progress` and a `bundle` quote — one student's private state
 * — and the server sends none of it on a public route. Keeping the two types
 * apart is what makes a component that reaches for `is_enrolled` here a compile
 * error rather than a field that is silently always undefined.
 */
export interface PublicCourseSummary {
  id: number;
  /** Already in the visitor's language. The server picks the column. */
  name: string | null;
  /**
   * Plain text, already flattened from the admin's rich text and truncated
   * server-side. **There is no HTML here on purpose** — a public card that
   * renders text needs no DOMPurify, so it cannot become an injection surface.
   * The full description arrives as HTML on the course detail endpoint, where
   * it is worth the sanitiser.
   */
  excerpt: string | null;

  category_id: number;
  category_name: string | null;
  /**
   * A key into a fixed icon registry, never a component or class name. Null when
   * the category has no icon set — the card then draws its plain fallback.
   */
  category_icon: CourseCategoryIconName | null;

  thumbnail_url: string | null;

  /** Integer minor units, per root CLAUDE.md §4.11. */
  price_cents: number;
  currency: string;
  is_free: boolean;
  /**
   * False when this paid course is sold only as part of its category's bundle.
   * The card says so instead of printing a price nobody can pay on its own.
   */
  sold_individually: boolean;

  topics_count: number;
  lessons_count: number;
  /** 0 when no lesson has a duration yet — hide the chip rather than show "0m". */
  total_duration_seconds: number;

  /**
   * The card's bullet points: real topic titles, at most three, in the admin's
   * order. `topics_count` is the true total, which may be larger.
   */
  topic_names: string[];
}

/** Query parameters for `GET public/courses`. */
export interface PublicCourseListParams {
  search?: string;
  category_id?: number;
  /** Capped server-side at 48 — an open endpoint cannot take an unbounded page. */
  per_page?: number;
  page?: number;
}
