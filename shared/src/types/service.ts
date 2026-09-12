/**
 * Premium services — the second thing a student can buy, alongside a course.
 *
 * Mirrors `backend/app/Http/Resources/ServiceResource.php` and
 * `ServicePurchaseResource.php`. The student-facing shapes live in
 * `studentService.ts`, kept apart for the same reason the backend keeps two
 * Resources: this one carries internal notes a student must never be sent.
 */

export type ServiceStatus = 'draft' | 'published';

/**
 * The glyph a service shows on the app's "Get My Service" grid.
 *
 * **These are meanings, not icon names** — `passport`, not `id-card`. Each
 * client maps the meaning to whatever its icon set calls that picture, so a
 * Lucide rename costs one line in a map instead of a data migration. Mirrors
 * `backend/app/Enums/ServiceIcon.php`, which is the validation authority;
 * adding a case means editing both, plus the two client maps in
 * `web/src/features/admin/services/serviceIcons.ts` and
 * `mobile/src/features/services/serviceIcons.ts`. Both maps are exhaustive
 * `Record<ServiceIconName, …>`s, so TypeScript fails the build on a miss.
 */
export type ServiceIconName =
  | 'passport'
  | 'visa'
  | 'flight'
  | 'cv'
  | 'jobs'
  | 'interview'
  | 'education'
  | 'attestation'
  | 'translation'
  | 'bank'
  | 'money'
  | 'medical'
  | 'insurance'
  | 'housing'
  | 'company'
  | 'driving'
  | 'sim'
  | 'relocation'
  | 'appointment'
  | 'contract'
  | 'documents'
  | 'consultation'
  | 'award'
  | 'other';

/**
 * The picker's contents and its order, shared so the admin sees the same list
 * whichever client grows one next. Ordered by how often Plan B is likely to
 * need them rather than alphabetically — an admin scanning for "Visa" finds it
 * in the first row, and `other` sits last because it is the fallback.
 *
 * Labels are the admin's own vocabulary, not the enum value. They are English
 * only and deliberately not run through i18n: the admin panel is English (root
 * CLAUDE.md §8 puts Sinhala on the student side), and the student never sees
 * these words — only the picture.
 */
export const SERVICE_ICONS: ReadonlyArray<{ value: ServiceIconName; label: string }> = [
  { value: 'visa', label: 'Visa' },
  { value: 'passport', label: 'Passport' },
  { value: 'flight', label: 'Flight booking' },
  { value: 'cv', label: 'CV writing' },
  { value: 'jobs', label: 'Job placement' },
  { value: 'interview', label: 'Interview prep' },
  { value: 'education', label: 'Education' },
  { value: 'attestation', label: 'Attestation' },
  { value: 'translation', label: 'Translation' },
  { value: 'bank', label: 'Bank account' },
  { value: 'money', label: 'Money transfer' },
  { value: 'medical', label: 'Medical' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'housing', label: 'Accommodation' },
  { value: 'company', label: 'Company setup' },
  { value: 'driving', label: 'Driving licence' },
  { value: 'sim', label: 'SIM / mobile' },
  { value: 'relocation', label: 'Relocation' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'contract', label: 'Contract' },
  { value: 'documents', label: 'Documents' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'award', label: 'Certification' },
  { value: 'other', label: 'Other' },
];

export interface Service {
  id: number;
  name: string;
  /** One line for a catalogue card. */
  summary: string | null;
  /** Null when the admin never picked one; clients fall back to `other`. */
  icon: ServiceIconName | null;
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
  icon?: ServiceIconName | null;
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
