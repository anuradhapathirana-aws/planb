import type { Industry } from './industry';
import type { Profession } from './profession';

export type VisaStatus = 'visit' | 'employment';

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
