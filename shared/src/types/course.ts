export type CourseStatus = 'draft' | 'published';

export type VideoProvider = 'upload' | 'external';

/**
 * The glyph a course category shows on the student app's Home row. Mirrors
 * `backend/app/Enums/CourseCategoryIcon.php`, which is the validation authority.
 *
 * **Meanings, not icon names**, like `ServiceIconName`: each client maps them to
 * whatever its icon set calls the picture. Adding one means editing the enum,
 * this union and `COURSE_CATEGORY_ICONS`, and the two exhaustive client maps —
 * `web/src/features/admin/courseCategories/courseCategoryIcons.ts` and
 * `mobile/src/features/home/categoryIcons.ts` — which fail to compile on a miss.
 */
export type CourseCategoryIconName =
  | 'migration'
  | 'language'
  | 'career'
  | 'interview'
  | 'writing'
  | 'legal'
  | 'culture'
  | 'finance'
  | 'healthcare'
  | 'hospitality'
  | 'construction'
  | 'technical'
  | 'digital'
  | 'social_media'
  | 'design'
  | 'sales'
  | 'skills'
  | 'education'
  | 'certification'
  | 'getting_started'
  | 'other';

/**
 * The admin picker's options, in the order it lists them. English only: the
 * admin panel is English, and a student never sees these words — only the glyph.
 */
export const COURSE_CATEGORY_ICONS: ReadonlyArray<{
  value: CourseCategoryIconName;
  label: string;
}> = [
  { value: 'migration', label: 'Migration' },
  { value: 'language', label: 'Language' },
  { value: 'career', label: 'Career & jobs' },
  { value: 'interview', label: 'Interview' },
  { value: 'writing', label: 'CV & writing' },
  { value: 'legal', label: 'Legal & rights' },
  { value: 'culture', label: 'UAE life & culture' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'construction', label: 'Construction' },
  { value: 'technical', label: 'Technical trades' },
  { value: 'digital', label: 'IT & digital' },
  { value: 'social_media', label: 'Social media' },
  { value: 'design', label: 'Design' },
  { value: 'sales', label: 'Sales & service' },
  { value: 'skills', label: 'Skills & training' },
  { value: 'education', label: 'Education' },
  { value: 'certification', label: 'Exams & certificates' },
  { value: 'getting_started', label: 'Getting started' },
  { value: 'other', label: 'Other' },
];

/**
 * A category or a sub-category — two levels, never more. `parent_id` null means
 * top-level. A course may sit on either level, and a parent need not have children.
 */
export interface CourseCategory {
  id: number;
  parent_id: number | null;
  name: string;
  /** Stored Sinhala name; null until translated. Admin-only — see `CourseVideo`. */
  name_si: string | null;
  description: string | null;
  /** Null when no admin picked one; the app then guesses a glyph from the name. */
  icon: CourseCategoryIconName | null;
  /** A sub-category's uploaded icon (PNG). When set it wins over `icon`. */
  icon_image_url: string | null;
  is_active: boolean;
  sort_order: number;
  /** Courses placed directly on this category. Only present on list responses. */
  programmes_count?: number;
  /** A top-level category's sub-categories, on list responses. */
  children?: CourseCategory[];
  /** Only loaded where a course needs to be labelled "Migration › UAE". */
  parent?: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface CourseCategoryFormValues {
  parent_id: number | null;
  name: string;
  name_si?: string | null;
  description?: string | null;
  icon?: CourseCategoryIconName | null;
}

export interface CourseCategoryListFilters {
  search?: string;
  is_active?: 'all' | '1' | '0';
  sort?: 'name' | 'sort_order' | 'created_at';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

/**
 * Where a lesson is in encoding. A Bunny-hosted upload is not watchable until
 * transcoding finishes, which is what makes `ready` distinct from `has_file`.
 * A locally hosted file is always `ready`.
 */
export type VideoProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface CourseVideo {
  id: number;
  course_topic_id: number;
  title: string;
  /**
   * The Sinhala lesson title, exactly as stored — null when nobody has entered
   * one. The student API never sends this field; it resolves the two columns
   * server-side and sends one `title` (see `studentCourse.ts`). It appears here
   * only because the admin form edits both.
   */
  title_si: string | null;
  provider: VideoProvider;
  duration_seconds: number | null;
  sort_order: number;
  /** The file URL is never exposed — playback goes through the signed stream endpoint. */
  has_file: boolean;
  processing_status: VideoProcessingStatus;
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
  /** Stored Sinhala topic name; null until translated. Admin-only — see `CourseVideo`. */
  title_si: string | null;
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
  /** Stored Sinhala programme name; null until translated. Admin-only — see `CourseVideo`. */
  name_si: string | null;
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
  /** Optional at every level: a course is translated after it is written, not with it. */
  name_si?: string | null;
  description?: string | null;
  price_cents: number;
  currency: string;
  status?: CourseStatus;
  topics: {
    id?: number;
    title: string;
    title_si?: string | null;
    description?: string | null;
    videos: { id?: number; title: string; title_si?: string | null; duration_seconds?: number | null }[];
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
