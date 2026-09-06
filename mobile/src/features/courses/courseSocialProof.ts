/**
 * ============================ SAMPLE DATA — NOT REAL ============================
 *
 * The Course Details design calls for a rating, a review count, an instructor and
 * a learner count. NONE of these exist yet: there is no `course_reviews` table, no
 * instructor relation, and no enrolment count on `StudentCourseSummaryResource`.
 * Anuradha asked for the UI now and the API later, so this file is the ONE place
 * the fake numbers live.
 *
 * WHEN THE BACKEND SHIPS: add the real fields to the student course Resource and
 * its `@shared` type, then delete this file. Every consumer imports `CourseSocialProof`,
 * so the compiler will point at each call site that needs rewiring — which is why
 * the shape here is what the API should eventually return, not something convenient.
 *
 * The values are derived from the course id rather than randomised, so they stay
 * put across re-renders, tab switches and refetches. A rating that changes while
 * the student is looking at it is worse than an obviously placeholder one.
 * =============================================================================
 */

export interface CourseSocialProof {
  /** 0–5, one decimal. */
  rating: number;
  ratings_count: number;
  learners: number;
  /**
   * Plan B is the provider of every course today, so this is the one field that
   * is not invented. It stays here because the real API will carry a per-course
   * instructor and this is the slot it will land in.
   */
  instructor_name: string;
}

/** A small deterministic hash, so course 7 always looks the same as course 7. */
function seed(courseId: number, salt: number): number {
  const value = Math.sin((courseId + 1) * salt) * 10_000;

  return value - Math.floor(value);
}

export function courseSocialProof(courseId: number): CourseSocialProof {
  return {
    // 4.4 – 5.0. Nothing below 4.4, because a placeholder must never read as a
    // warning about a real course Plan B is selling.
    rating: Math.round((4.4 + seed(courseId, 12.9898) * 0.6) * 10) / 10,
    ratings_count: 120 + Math.floor(seed(courseId, 78.233) * 2_400),
    learners: 300 + Math.floor(seed(courseId, 43.7585) * 3_700),
    instructor_name: 'Plan B International',
  };
}

/** "1.2k" — a learner count has to fit next to an avatar stack. */
export function formatCompactCount(value: number): string {
  if (value < 1_000) return String(value);

  const thousands = value / 1_000;

  return `${thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10}k`;
}
