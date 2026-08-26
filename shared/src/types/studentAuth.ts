import type { Industry } from './industry';
import type { Profession } from './profession';
import type { VisaStatus } from './student';

/**
 * The authenticated student, as `/api/v1/student/me` returns it.
 *
 * Deliberately NOT the admin `Student` type: that one carries `is_blocked`,
 * `imported_by` and other admin-only fields, and reusing it would mean a
 * student-facing Resource had to fill them in (root CLAUDE.md §16.5).
 */
export interface StudentProfile {
  id: number;
  student_id: string;
  full_name: string | null;
  email: string | null;
  contact_number: string | null;
  address: string | null;
  date_of_birth: string | null;
  highest_qualification: string | null;
  industry: Industry | null;
  profession: Profession | null;
  visa_status: VisaStatus | null;
  languages_spoken: string[];
  profile_photo_url: string | null;
  registered_at: string | null;
  email_verified_at: string | null;
}

/** What a student may change about themselves. See `backend/CLAUDE.md`. */
export interface StudentProfilePayload {
  contact_number?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  highest_qualification?: string | null;
  industry_id?: number | null;
  profession_id?: number | null;
  languages_spoken?: string[];
}

export interface RequestCodePayload {
  email: string;
}

/**
 * Returned for EVERY `request-code` call, including ones where no student
 * matched and no email was sent. The response must not reveal which — student
 * IDs are sequential and a distinguishable answer makes this an enumeration
 * oracle (`backend/CLAUDE.md` §4).
 */
export interface RequestCodeResponse {
  expires_in_seconds: number;
  resend_after_seconds: number;
}

export interface VerifyCodePayload {
  email: string;
  code: string;
  device_name?: string;
}

export interface GoogleSignInPayload {
  /** The Google ID token (a JWT). Verified server-side against Google's JWKS. */
  id_token: string;
  device_name?: string;
}

export interface StudentSession {
  /** Sanctum plain-text token. Goes straight to expo-secure-store, nowhere else. */
  token: string;
  expires_at: string;
  student: StudentProfile;
}

/** `refresh` rotates the token without re-reading the student record. */
export interface RefreshedToken {
  token: string;
  expires_at: string;
}
