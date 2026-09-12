import { useMemo } from 'react';

import type { StudentProfile } from '@shared/types/studentAuth';

/**
 * The fields that count toward a complete profile, and what each is worth.
 *
 * **Every field here MUST be settable from `app/profile/edit.tsx`.** That is the
 * rule this list exists under, and breaking it does not show up as a bug — it
 * shows up as a student who has filled in everything the app offers and is still
 * told to complete their profile, with no way left to act on it. Two fields were
 * doing exactly that and have been removed:
 *
 * - **`languages_spoken`** was counted and the Edit Profile form has no input
 *   for it at all. It is in the payload type and the API accepts it, so the
 *   field is only reachable from the admin panel. 11 of 44 students were stuck
 *   at 89% with nothing on screen they could do about it.
 * - **`contact_number`** is rendered as a locked read-only row on purpose:
 *   changing a phone number needs an SMS code sent to the NEW number, which is
 *   its own unbuilt flow. A student who registered with Google has no number at
 *   all and no way to add one.
 *
 * `bio` was the opposite oversight — editable in the form since it shipped, but
 * never counted here.
 *
 * Computed in the app rather than on the server, deliberately: it needs no
 * request, and it updates the instant a student saves their profile instead of
 * waiting for a refetch. The trade is that this list and the Edit Profile form
 * have to stay in step, in BOTH directions — a field added there belongs here,
 * and a field that stops being editable has to come out.
 *
 * Name and email are excluded for the same reason as the two removals: both are
 * set at registration and neither can be edited in the app, so counting them
 * would inflate every student's score by a fixed amount and make the number
 * meaningless as a prompt.
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
