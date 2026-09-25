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

/** One lesson in a public syllabus: a title and a length, and nothing that locates the video. */
export interface PublicCourseLesson {
  title: string | null;
  /** Null when the lesson has no duration recorded yet. */
  duration_seconds: number | null;
}

export interface PublicCourseTopic {
  id: number;
  title: string | null;
  lessons_count: number;
  /** Sum of the lessons' durations; 0 when none are recorded. */
  duration_seconds: number;
  lessons: PublicCourseLesson[];
}

/**
 * A course's public page (`GET public/courses/{id}`). Mirrors
 * `backend/app/Http/Resources/Public/PublicCourseDetailResource.php`.
 *
 * The card's fields plus the syllabus. Still no student state — a signed-in
 * student's enrolment comes from their own `student/courses`.
 */
export interface PublicCourseDetail extends Omit<PublicCourseSummary, 'topic_names'> {
  /** PLAIN text (the admin field is a textarea). Render as text, never as HTML. */
  description: string | null;
  topics: PublicCourseTopic[];
  /** Null when there is no final paper, or it has no questions yet. */
  assessment: { questions_count: number } | null;
  /**
   * Set when this course is sold only inside its category's bundle. The price
   * is the bundle's LIST price; what a student pays (less what they own) comes
   * from the student API after sign-in.
   */
  bundle: { category_id: number; name: string | null; price_cents: number; currency: string } | null;
}

/**
 * A category's public page — a course bundle's, on the website
 * (`GET public/course-categories/{id}`). Mirrors
 * `backend/app/Http/Resources/Public/PublicCategoryDetailResource.php`.
 *
 * No student state: what a signed-in student owns and would pay comes from
 * `GET student/course-categories/{id}` (`StudentCategoryDetail`).
 */
export interface PublicCategoryDetail {
  id: number;
  name: string | null;
  icon: CourseCategoryIconName | null;
  parent: { id: number; name: string | null } | null;
  courses_count: number;
  lessons_count: number;
  total_duration_seconds: number;
  /** For a bundle, exactly the courses the bundle sells. */
  courses: PublicCourseSummary[];
  /** Visible sub-categories with a course. `own_bundle`: sold separately — link, don't list. */
  children: { id: number; name: string | null; courses_count: number; own_bundle: boolean }[];
  /**
   * Null when sold one by one. `category_id` is the bundle's own page — this
   * one, or the main category's. `price_cents` is the LIST price.
   */
  bundle: { category_id: number; name: string | null; price_cents: number; currency: string } | null;
}

/** `price` on `GET public/courses`. Mirrors `PublicCourseService::PRICE_FILTERS`. */
export type PublicCoursePriceFilter = 'free' | 'paid';

/**
 * `sort` on `GET public/courses`. Mirrors `PublicCourseService::SORTS`.
 * `recommended` — the admin's course order — is the default.
 */
export type PublicCourseSort = 'recommended' | 'newest' | 'price_asc' | 'price_desc';

/**
 * A category as a filter on the catalogue page (`GET public/course-categories`).
 * Only categories with at least one visible course are sent. Mirrors
 * `backend/app/Http/Resources/Public/PublicCourseCategoryResource.php`.
 */
export interface PublicCourseCategory {
  id: number;
  /** Already in the visitor's language. */
  name: string | null;
  icon: CourseCategoryIconName | null;
  /** Visible courses; a parent's count includes its sub-categories'. */
  courses_count: number;
  /** Present on top-level categories only. */
  children?: PublicCourseCategory[];
}

/** Query parameters for `GET public/courses`. */
export interface PublicCourseListParams {
  search?: string;
  category_id?: number;
  price?: PublicCoursePriceFilter;
  sort?: PublicCourseSort;
  /** Capped server-side at 48 — an open endpoint cannot take an unbounded page. */
  per_page?: number;
  page?: number;
}
