import { useMemo } from 'react';

import type { StudentProfile } from '@shared/types/studentAuth';
import { profileCompletion, type ProfileCompletion } from '@shared/lib/profileCompletion';

export type { ProfileCompletion };

/**
 * How far through their profile a student is. The field list and the maths live
 * in `@shared/lib/profileCompletion`, shared with the website portal so both
 * show the same percentage — read the rule there before adding a field.
 */
export function useProfileCompletion(profile: StudentProfile | null): ProfileCompletion {
  return useMemo(() => profileCompletion(profile), [profile]);
}
