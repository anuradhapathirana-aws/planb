/**
 * Premium services — the second thing a student can buy, alongside a course.
 *
 * Mirrors `backend/app/Http/Resources/ServiceResource.php` and
 * `ServicePurchaseResource.php`. The student-facing shapes live in
 * `studentService.ts`, kept apart for the same reason the backend keeps two
 * Resources: this one carries internal notes a student must never be sent.
 */

export type ServiceStatus = 'draft' | 'published';

export interface Service {
  id: number;
  name: string;
  /** One line for a catalogue card. */
  summary: string | null;
  /** Sanitized HTML authored in the rich-text editor. */
  description: string | null;
  /** Smallest currency unit, integer, always above zero (CLAUDE.md §4.11). */
  price_cents: number;
  currency: string;
  /** Free text, e.g. "3-5 working days". Null when not stated. */
  delivery_time: string | null;
  status: ServiceStatus;
  sort_order: number;
  /** 16:9 catalogue art. Null when none has been uploaded — a normal state. */
  thumbnail_url: string | null;
  /** Only present on list/detail responses. */
  purchases_count?: number;
  /** How many purchases are still waiting on somebody. */
  open_purchases_count?: number;
  created_at: string;
  updated_at: string;
}

/** What the Add/Edit Service form posts. The thumbnail goes up separately. */
export interface ServicePayload {
  name: string;
  summary?: string | null;
  description?: string | null;
  price_cents: number;
  currency: string;
  delivery_time?: string | null;
  status?: ServiceStatus;
}

export interface ServiceListFilters {
  search?: string;
  status?: ServiceStatus | 'all';
  sort?: 'name' | 'sort_order' | 'price_cents' | 'created_at';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export type ServicePurchaseStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/** One delivery job in the admin queue. */
export interface ServicePurchase {
  id: number;
  status: ServicePurchaseStatus;
  is_open: boolean;
  /** What the admin may move this to next. Empty once it is closed. */
  allowed_transitions: ServicePurchaseStatus[];
  /** Frozen at purchase time; the live name is under `service`. */
  title: string;
  student_id: number;
  student?: {
    id: number;
    student_id: string;
    full_name: string | null;
    email: string | null;
  };
  service_id: number;
  service?: { id: number; name: string };
  order_id: number;
  order?: {
    id: number;
    order_number: string;
    amount_cents: number;
    currency: string;
    status: string;
    paid_at: string | null;
  };
  /** Internal working note. Never present on a student-facing payload. */
  admin_note: string | null;
  handled_by?: string | null;
  purchased_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServicePurchaseListFilters {
  search?: string;
  status?: ServicePurchaseStatus | 'all';
  service_id?: number | 'all';
  student_id?: number;
  sort?: 'purchased_at' | 'created_at' | 'status';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface ServicePurchaseStats {
  pending: number;
  in_progress: number;
  completed: number;
}
