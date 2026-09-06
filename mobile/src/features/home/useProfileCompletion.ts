import { useMemo } from 'react';

import type { StudentProfile } from '@shared/types/studentAuth';

/**
 * The fields that count toward a complete profile, and what each is worth.
 *
 * Computed in the app rather than on the server, deliberately: it needs no
 * request, and it updates the instant a student saves their profile instead of
 * waiting for a refetch. The trade is that this list and the Edit Profile form
 * have to stay in step — if a field is added there, add it here.
 *
 * Name and email are excluded even though they are stored: both are set at
 * registration and neither can be edited in the app, so counting them would
 * inflate every student's score by a fixed amount and make the number
 * meaningless as a prompt.
 */
const WEIGHTED_FIELDS: readonly ((profile: StudentProfile) => boolean)[] = [
  (p) => p.profile_photo_url !== null,
  (p) => hasText(p.contact_number),
  (p) => hasText(p.address),
  (p) => hasText(p.date_of_birth),
  (p) => hasText(p.highest_qualification),
  (p) => p.industry !== null,
  (p) => p.profession !== null,
  (p) => p.visa_status !== null,
  // Optional-chained: the API always sends `[]`, but a session persisted by an
  // older build can be missing the key entirely, and a crash here would take
  // the whole Home screen down over a cosmetic percentage.
  (p) => (p.languages_spoken?.length ?? 0) > 0,
];

function hasText(value: string | null): boolean {
  return value !== null && value.trim() !== '';
}

export interface ProfileCompletion {
  /** 0–100, rounded. */
  percent: number;
  isComplete: boolean;
}

/**
 * How far through their profile a student is.
 *
 * Every field weighs the same. A weighting that made the photo worth more than
 * the profession would need a reason from the client, and an arbitrary one is
 * worse than none — the number only has to be directionally honest and move
 * when the student fills something in.
 */
export function useProfileCompletion(profile: StudentProfile | null): ProfileCompletion {
  return useMemo(() => {
    if (profile === null) return { percent: 0, isComplete: false };

    const filled = WEIGHTED_FIELDS.filter((isFilled) => isFilled(profile)).length;
    const total = WEIGHTED_FIELDS.length;

    return {
      percent: Math.round((filled / total) * 100),
      isComplete: filled === total,
    };
  }, [profile]);
}
