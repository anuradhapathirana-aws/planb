import type { QuestionType } from './course';

/**
 * The Q&A paper as a STUDENT sees it.
 *
 * The defining difference from the admin types in `course.ts`: there is no
 * `is_correct` anywhere in this file, and there must never be. A client that
 * simply doesn't render the field still ships the answer key in the network
 * tab (root CLAUDE.md §8 "Answer Keys & Student-Facing Payloads"). Grading
 * happens on the server; the answers only ever travel back in a result, and
 * even then only once they can no longer be used to cheat.
 */

export interface StudentQuestionOption {
  id: number;
  text: string;
}

export interface StudentQuestion {
  id: number;
  text: string;
  type: QuestionType;
  options: StudentQuestionOption[];
}

/** Why the assessment CTA is disabled, so the app can explain rather than just grey out. */
export type AttemptBlockedReason =
  | 'videos_incomplete'
  | 'attempts_exhausted'
  | 'already_passed'
  | 'no_questions';

export interface StudentPaperSummary {
  id: number;
  title: string;
  /** Sanitized HTML. */
  instructions: string | null;
  pass_mark: number;
  /** Null = unlimited retries. */
  max_attempts: number | null;
  requires_all_videos_watched: boolean;
  questions_count: number;
  attempts_used: number;
  /** Null when `max_attempts` is null. */
  attempts_remaining: number | null;
  has_passed: boolean;
  can_attempt: boolean;
  blocked_reason: AttemptBlockedReason | null;
}

export interface StudentPaperDetail extends StudentPaperSummary {
  questions: StudentQuestion[];
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'abandoned';

export interface PaperAttempt {
  id: number;
  course_paper_id: number;
  attempt_number: number;
  status: AttemptStatus;
  /**
   * The pass mark as it stood when this attempt started. An admin raising the
   * paper's `pass_mark` afterwards must not retroactively fail a past cohort.
   */
  pass_mark_snapshot: number;
  total_questions: number;
  started_at: string;
}

export interface PaperAnswerPayload {
  question_id: number;
  option_id: number;
}

export interface PaperSubmissionPayload {
  answers: PaperAnswerPayload[];
}

export interface PaperAnswerResult {
  question_id: number;
  question_text: string;
  selected_option_id: number | null;
  selected_option_text: string | null;
  is_correct: boolean;
  /**
   * The right answer — present ONLY once revealing it can no longer help:
   * the student passed, or has no attempts left. Otherwise null, because
   * showing it after a failed attempt makes unlimited retries meaningless.
   */
  correct_option_id: number | null;
  correct_option_text: string | null;
}

export interface PaperAttemptResult extends PaperAttempt {
  correct_answers: number;
  score_percent: number;
  is_passed: boolean;
  submitted_at: string;
  answers: PaperAnswerResult[];
}
