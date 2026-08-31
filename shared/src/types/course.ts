export type CourseStatus = 'draft' | 'published';

export type VideoProvider = 'upload' | 'external';

export interface CourseCategory {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  /** Only present on list responses. */
  programmes_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CourseCategoryFormValues {
  name: string;
  description?: string | null;
}

export interface CourseCategoryListFilters {
  search?: string;
  is_active?: 'all' | '1' | '0';
  sort?: 'name' | 'sort_order' | 'created_at';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface CourseVideo {
  id: number;
  course_topic_id: number;
  title: string;
  provider: VideoProvider;
  duration_seconds: number | null;
  sort_order: number;
  /** The file URL is never exposed — playback goes through the signed stream endpoint. */
  has_file: boolean;
  file_name: string | null;
  file_size_bytes: number | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseTopic {
  id: number;
  course_programme_id: number;
  title: string;
  /** Sanitized HTML authored in the rich-text editor. */
  description: string | null;
  sort_order: number;
  videos?: CourseVideo[];
  created_at: string;
  updated_at: string;
}

export interface CourseProgramme {
  id: number;
  course_category_id: number;
  name: string;
  description: string | null;
  status: CourseStatus;
  /** Smallest currency unit, integer. 0 means free (CLAUDE.md §4.11). */
  price_cents: number;
  currency: string;
  is_free: boolean;
  enrolments_count?: number;
  /** Course art, 16:9. Null when none has been uploaded — a normal state. */
  thumbnail_url: string | null;
  sort_order: number;
  category?: CourseCategory;
  topics?: CourseTopic[];
  /** Summary of the optional Q&A paper; null when the programme has none. */
  paper?: CoursePaper | null;
  topics_count?: number;
  videos_count?: number;
  created_at: string;
  updated_at: string;
}

/** What the Course form posts — the whole tree in one request, files excluded. */
export interface CourseProgrammePayload {
  course_category_id: number;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  status?: CourseStatus;
  topics: {
    id?: number;
    title: string;
    description?: string | null;
    videos: { id?: number; title: string; duration_seconds?: number | null }[];
  }[];
}

export interface CourseProgrammeListFilters {
  search?: string;
  course_category_id?: number | 'all';
  status?: CourseStatus | 'all';
  sort?: 'name' | 'sort_order' | 'created_at';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

/** Short-lived signed playback link, refetched rather than cached long-term. */
export interface VideoPlayback {
  url: string;
  expires_at: string;
}

export type QuestionType = 'yes_no' | 'multiple_choice';

export interface CourseQuestionOption {
  id?: number;
  text: string;
  /** Admin-only. The student-facing payload must never carry this. */
  is_correct: boolean;
  sort_order?: number;
}

export interface CourseQuestion {
  id?: number;
  course_paper_id?: number;
  text: string;
  type: QuestionType;
  sort_order?: number;
  options: CourseQuestionOption[];
}

/**
 * The optional Q&A paper for a programme (FR-ADM-008c). A programme with no
 * paper — or a paper with no questions — shows students nothing at all.
 */
export interface CoursePaper {
  id: number;
  course_programme_id: number;
  title: string;
  /** Sanitized HTML from the rich-text editor. */
  instructions: string | null;
  pass_mark: number;
  /** Null = unlimited retries. */
  max_attempts: number | null;
  requires_all_videos_watched: boolean;
  /** Only on the full paper response; the programme payload sends the count alone. */
  questions?: CourseQuestion[];
  questions_count?: number;
  created_at: string;
  updated_at: string;
}

/** What the paper builder submits — the whole paper in one request. */
export interface CoursePaperPayload {
  title: string;
  instructions?: string | null;
  pass_mark: number;
  max_attempts?: number | null;
  requires_all_videos_watched: boolean;
  questions: {
    id?: number;
    text: string;
    type: QuestionType;
    options: { id?: number; text: string; is_correct: boolean }[];
  }[];
}
