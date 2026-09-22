import type { ProgrammeProgress, VideoProgress } from './progress';
import type { StudentPaperSummary } from './paper';
import type { CourseCategoryIconName } from './course';

/**
 * The course tree as a student sees it. Separate from the admin `course.ts`
 * types on purpose: these carry per-student progress and lock state, and carry
 * none of the authoring fields (`sort_order` churn, `status`, counts).
 *
 * **Every title here arrives already in the student's language.** The server
 * reads `Accept-Language` and picks between the English and Sinhala columns
 * itself, so there is no `name_si`/`title_si` on these types and no screen has
 * to choose. A client that switches language must therefore refetch anything it
 * cached under the old header — `mobile/src/lib/i18n.ts` does that.
 */

export interface StudentCourseVideo {
  id: number;
  title: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  progress: VideoProgress;
  /**
   * True until the preceding lesson is watched. Enforced server-side; the app
   * greys the row out rather than hiding it, so the student can see what is next.
   */
  is_locked: boolean;
}

export interface StudentCourseTopic {
  id: number;
  title: string;
  /** Sanitized HTML. Rendering it needs DOMPurify on web (root CLAUDE.md §7.6). */
  description: string | null;
  videos: StudentCourseVideo[];
  videos_watched: number;
  is_complete: boolean;
}

/**
 * A course category as the app draws it (`GET /student/course-categories`):
 * every visible top-level category, in admin order, with its active
 * sub-categories nested under `children`. Includes categories with no
 * published courses yet. `name` is already in the student's language.
 */
export interface StudentCourseCategory {
  id: number;
  name: string;
  /** Null when no admin picked one; the app guesses a glyph from the name. */
  icon: CourseCategoryIconName | null;
  /** A sub-category's uploaded icon. When set, draw it instead of `icon`. */
  icon_image_url: string | null;
  /** Present on top-level categories; empty when it has no sub-categories. */
  children?: StudentCourseCategory[];
}

/** The bundle a course is sold in — its category's own, or its main category's. */
export interface StudentCourseBundleRef {
  category_id: number;
  /** Already in the student's language. */
  name: string;
  /** What this student still has to buy in it. Only on the course detail response. */
  remaining_count: number | null;
  remaining_price_cents: number | null;
  currency: string;
}

/** A sub-category row on a Category page. */
export interface StudentCategoryChild extends StudentCourseCategory {
  /** Sold as a bundle of its own — not part of this page's bundle; bought on its own page. */
  own_bundle: boolean;
}

/**
 * One category's page (`GET /student/course-categories/{id}`). Every figure is
 * the server's — the app never adds prices up itself.
 */
export interface StudentCategoryDetail {
  id: number;
  name: string;
  icon: CourseCategoryIconName | null;
  icon_image_url: string | null;
  /** The main category, when this is a sub-category. */
  parent: { id: number; name: string; icon: CourseCategoryIconName | null } | null;
  /** Active sub-categories — empty for a sub-category or a main one without any. */
  children: StudentCategoryChild[];
  courses: StudentCourseSummary[];
  courses_count: number;
  total_duration_seconds: number;
  owned_count: number;
  /** How the courses sitting directly in this category are sold. */
  selling_mode: 'single' | 'bundle';
  /**
   * The bundle this page sells, as this student would buy it — this category's
   * own, or its main category's when it follows that one. Null when sold one by one.
   */
  bundle: {
    category_id: number;
    name: string;
    courses_count: number;
    owned_count: number;
    /** What is left to buy — courses already owned are never charged again. */
    remaining_count: number;
    remaining_price_cents: number;
    currency: string;
    /** The server's say-so to show the buy button. */
    is_available: boolean;
  } | null;
}

/** List-row shape — no topics, so the courses list stays one small response. */
export interface StudentCourseSummary {
  id: number;
  name: string;
  description: string | null;
  /** Relations are by id — names can be renamed, ids cannot. */
  category_id: number;
  /** The top-level category above it when the course sits on a sub-category. */
  parent_category_id: number | null;
  /** Display only. Never filter or compare on it. */
  category_name: string | null;
  /**
   * "Course N" — its place in the order the admin wants its own category taken
   * in. Numbering restarts per category (a sub-category counts from 1 too) and
   * counts published courses only. A suggested path, never a lock.
   */
  position: number | null;
  /** Course art, 16:9. Null when the admin hasn't uploaded one. */
  thumbnail_url: string | null;
  /** Integer smallest units (root CLAUDE.md §4.11). 0 when the course is free. */
  price_cents: number;
  currency: string;
  is_free: boolean;
  /**
   * False when this paid course is sold only in its category's bundle — point
   * at the bundle instead of a price. The enrol endpoint enforces it anyway.
   */
  sold_individually: boolean;
  /** The bundle this course is sold in, when its main category sells as one. */
  bundle: StudentCourseBundleRef | null;
  /**
   * Whether this student may open the content — NOT whether it exists. The
   * catalogue is browsable to everyone; `false` means every lesson is locked and
   * the stream/paper endpoints will refuse. Presentation only: the paywall is
   * enforced on the endpoint (root CLAUDE.md, Payments & Purchasables).
   */
  is_enrolled: boolean;
  /**
   * Whether THIS student has saved the course to their wishlist. Unlike
   * `is_enrolled` it gates nothing — it only decides whether the heart is filled.
   */
  is_wishlisted: boolean;
  topics_count: number;
  videos_count: number;
  /**
   * Total run time of every lesson, in seconds. 0 when no lesson has a duration
   * recorded — render nothing rather than "0m" in that case.
   */
  total_duration_seconds: number;
  has_paper: boolean;
  /** ISO 8601. When the course FIRST went live — never refreshed on a republish. */
  published_at: string | null;
  /** Published within the last 30 days (`CourseProgramme::NEW_FOR_DAYS`). */
  is_new: boolean;
  /**
   * Only present on a search response, and only when the course's own name did
   * NOT match — it is the topic title that put this row in the results, so the
   * UI can explain why "Labour Law Basics" came back for "visa".
   */
  matched_topic?: string | null;
  progress: ProgrammeProgress;
}

export interface StudentCourseDetail extends StudentCourseSummary {
  topics: StudentCourseTopic[];
  /** Null when the programme has no Q&A paper — most do not. */
  paper: StudentPaperSummary | null;
}

export interface StudentCourseListFilters {
  /** Matched against the course name AND its topic titles, server-side. */
  search?: string;
  /**
   * A top-level category returns its own courses plus every sub-category's; a
   * sub-category returns just its own. Omitted means every category.
   */
  category_id?: number;
  per_page?: number;
  page?: number;
}
