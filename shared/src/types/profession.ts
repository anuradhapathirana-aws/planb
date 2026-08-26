import type { Industry } from '@/types/industry';

export interface Profession {
  id: number;
  industry_id: number;
  name: string;
  is_active: boolean;
  industry?: Industry;
  created_at: string;
  updated_at: string;
}

export interface ProfessionFormValues {
  industry_id: number;
  name: string;
}

export interface ProfessionListFilters {
  search?: string;
  industry_id?: number | 'all';
  is_active?: 'all' | '1' | '0';
  sort?: 'name' | 'created_at';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}
