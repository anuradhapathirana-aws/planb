import type { ProgrammeProgress, VideoProgress } from './progress';
import type { StudentPaperSummary } from './paper';

/**
 * The course tree as a student sees it. Separate from the admin `course.ts`
 * types on purpose: these carry per-student progress and lock state, and carry
 * none of the authoring fields (`sort_order` churn, `status`, counts).
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

/** List-row shape — no topics, so the courses list stays one small response. */
export interface StudentCourseSummary {
  id: number;
  name: string;
  description: string | null;
  category_name: string | null;
  /** Course art, 16:9. Null when the admin hasn't uploaded one. */
  thumbnail_url: string | null;
  /** Integer smallest units (root CLAUDE.md §4.11). 0 when the course is free. */
  price_cents: number;
  currency: string;
  is_free: boolean;
  /**
   * Whether this student may open the content — NOT whether it exists. The
   * catalogue is browsable to everyone; `false` means every lesson is locked and
   * the stream/paper endpoints will refuse. Presentation only: the paywall is
   * enforced on the endpoint (root CLAUDE.md, Payments & Purchasables).
   */
  is_enrolled: boolean;
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
  per_page?: number;
  page?: number;
}

/**
 * The three filters the Home search dropdown offers over its results.
 *
 * `unfinished` is a SUBSET of `enrolled`, not a sibling — these are filters over
 * one result set, not a partition of it. `available` is everything not enrolled,
 * at any age; `is_new` is a badge on the row rather than a filter, so an older
 * course the student has not bought stays findable.
 */
export type CourseSearchTab = 'available' | 'enrolled' | 'unfinished';
