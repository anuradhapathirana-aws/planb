import type { Industry } from './industry';
import type { Profession } from './profession';

export type VisaStatus = 'visit' | 'employment';

/**
 * A private file on a student record (CV, profile video). Deliberately carries no
 * URL: reading one needs a fresh short-lived signed link from the documents
 * endpoint, so nothing here can be hot-linked or shared out of the panel.
 */
export interface StudentDocument {
  has_file: boolean;
  /** The name the admin uploaded, not the internal storage name. */
  file_name: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
}

/** Short-lived signed link to one student document. Fetched fresh, never cached. */
export interface StudentDocumentLink {
  url: string;
  expires_at: string;
}

export type StudentDocumentType = 'cv' | 'profile-video';

export interface Student {
  id: number;
  student_id: string;
  full_name: string | null;
  email: string | null;
  contact_number: string | null;
  address: string | null;
  date_of_birth: string | null;
  highest_qualification: string | null;
  industry_id: number | null;
  profession_id: number | null;
  industry: Industry | null;
  profession: Profession | null;
  visa_status: VisaStatus | null;
  languages_spoken: string[];
  is_blocked: boolean;
  is_registered: boolean;
  registered_at: string | null;
  profile_photo_url: string | null;
  cv: StudentDocument;
  profile_video: StudentDocument;
  imported_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentFormValues {
  /** Ignored on create (server auto-generates it); sent as read-only context on update. */
  student_id?: string;
  full_name?: string | null;
  email?: string | null;
  contact_number?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  highest_qualification?: string | null;
  industry_id?: number | null;
  profession_id?: number | null;
  visa_status?: VisaStatus | null;
  languages_spoken?: string[];
}

export interface StudentListFilters {
  search?: string;
  status?: 'all' | 'active' | 'blocked' | 'registered' | 'pending';
  visa_status?: VisaStatus | 'all';
  sort?: 'student_id' | 'full_name' | 'created_at' | 'registered_at';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface StudentStats {
  total: number;
  registered: number;
  pending_registration: number;
  blocked: number;
  new_this_month: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; student_id: string | null; message: string }>;
}
