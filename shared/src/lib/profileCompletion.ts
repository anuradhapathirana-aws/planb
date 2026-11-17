import type { StudentProfile } from '../types/studentAuth';

/**
 * The fields that count toward a complete profile — one list for the mobile app
 * and the website portal, so a student never sees two different percentages.
 *
 * **Every field here MUST be editable by the student in BOTH clients**
 * (`mobile/app/profile/edit.tsx` and `site/…/ProfileForm.tsx`). A field that is
 * counted but not editable leaves a student stuck below 100% with nothing they
 * can do about it — that is why `languages_spoken` (no input anywhere) and
 * `contact_number` (locked: changing it needs a verification flow) are left out.
 * Name and email are set at registration and not editable, so counting them
 * would only inflate every score by a fixed amount.
 *
 * Every field weighs the same: the number only has to be directionally honest
 * and move when the student fills something in.
 */
const WEIGHTED_FIELDS: readonly ((profile: StudentProfile) => boolean)[] = [
  (p) => p.profile_photo_url !== null,
  (p) => hasText(p.address),
  (p) => hasText(p.date_of_birth),
  (p) => hasText(p.highest_qualification),
  (p) => hasText(p.bio),
  (p) => p.industry !== null,
  (p) => p.profession !== null,
  (p) => p.visa_status !== null,
];

function hasText(value: string | null): boolean {
  return value !== null && value.trim() !== '';
}

export interface ProfileCompletion {
  /** 0–100, rounded. */
  percent: number;
  isComplete: boolean;
}

/** How far through their profile a student is. Computed client-side: no request needed. */
export function profileCompletion(profile: StudentProfile | null): ProfileCompletion {
  if (profile === null) return { percent: 0, isComplete: false };

  const filled = WEIGHTED_FIELDS.filter((isFilled) => isFilled(profile)).length;
  const total = WEIGHTED_FIELDS.length;

  return { percent: Math.round((filled / total) * 100), isComplete: filled === total };
}
