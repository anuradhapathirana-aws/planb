import type { ServicePurchaseStatus } from './service';
import type { StudentOrder } from './studentOrder';

/**
 * Premium services as a *student* sees them.
 *
 * Deliberately separate from the admin shapes in `service.ts`, mirroring the
 * backend's own split (`StudentServiceSummaryResource` vs `ServiceResource`):
 * the student payload carries no draft services, no purchase counts, and — on a
 * purchase — no internal note and no handler identity. Reusing the admin type
 * here would make the app expect fields it must never be sent, and would hide
 * the day someone added one to the student endpoint.
 */

export interface StudentServiceSummary {
  id: number;
  name: string;
  summary: string | null;
  price_cents: number;
  currency: string;
  delivery_time: string | null;
  thumbnail_url: string | null;
  /**
   * Presentation, not a control: it lets the app show "In progress" rather than
   * a Buy button that would 422. The refusal itself lives on the endpoint.
   */
  open_purchase_status: ServicePurchaseStatus | null;
  has_open_purchase: boolean;
}

export interface StudentServiceDetail extends StudentServiceSummary {
  /**
   * Sanitized HTML. The mobile app renders it through its own allowlist parser
   * (`mobile/src/lib/parseHtml.ts`); a web client needs DOMPurify (CLAUDE.md §7.6).
   */
  description: string | null;
  /**
   * This student's own most recent purchase of this service, or null — scoped to
   * the caller on the server, never "the latest purchase". It is what the
   * delivery tracker is drawn from, so the detail screen needs no second request.
   */
  latest_purchase: StudentServicePurchase | null;
}

export interface StudentServicePurchase {
  id: number;
  status: ServicePurchaseStatus;
  is_open: boolean;
  /** Frozen at purchase time — a later rename cannot rewrite what was bought. */
  title: string;
  service?: {
    id: number;
    name: string;
    thumbnail_url: string | null;
    /**
     * Whether the catalogue entry can still be opened. False once the admin has
     * withdrawn or unpublished it — the purchase stays (it was paid for), but
     * linking to the service would land on a 404.
     */
    is_available: boolean;
  } | null;
  order?: {
    id: number;
    order_number: string;
    amount_cents: number;
    currency: string;
    status: string;
  };
  purchased_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

/**
 * What `POST /student/services/{service}/purchase` returns.
 *
 * Always `payment_required` — unlike a course there is no free branch, because a
 * service exists to be paid for. The app never sends an amount; the price comes
 * from the service on the server.
 */
export interface PurchaseServiceResult {
  status: 'payment_required';
  order: StudentOrder;
}
