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
  topics_count: number;
  videos_count: number;
  has_paper: boolean;
  progress: ProgrammeProgress;
}

export interface StudentCourseDetail extends StudentCourseSummary {
  topics: StudentCourseTopic[];
  /** Null when the programme has no Q&A paper — most do not. */
  paper: StudentPaperSummary | null;
}

export interface StudentCourseListFilters {
  search?: string;
  per_page?: number;
  page?: number;
}
