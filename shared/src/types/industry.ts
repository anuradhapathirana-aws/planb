export interface Industry {
  id: number;
  name: string;
  is_active: boolean;
  professions_count?: number;
  created_at: string;
  updated_at: string;
}

export interface IndustryFormValues {
  name: string;
}

export interface IndustryListFilters {
  search?: string;
  is_active?: 'all' | '1' | '0';
  sort?: 'name' | 'created_at';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}
