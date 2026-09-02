import type { OrderStatus, PaymentMethod, PaymentStatus } from './order';

/**
 * Orders and payments as a *student* sees them.
 *
 * Deliberately separate from the admin shapes in `order.ts`, mirroring the
 * backend's own split (`StudentOrderResource` vs `OrderResource`): the student
 * payload carries no gateway name, no gateway payload and no reviewer identity.
 * Re-using the admin type here would make the app expect fields it must never
 * be sent — and would hide the day someone added one to the student endpoint.
 */

export interface StudentPayment {
  id: number;
  method: PaymentMethod;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  /** The reference the student typed off their bank slip. Null for card. */
  reference_number: string | null;
  receipt_url: string | null;
  /** Why a transfer was rejected, so the student knows what to fix. */
  review_remark: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface StudentOrder {
  id: number;
  order_number: string;
  /** What was bought, frozen at purchase time — a later price change can't rewrite history. */
  title: string;
  /**
   * What was bought, in terms the app can act on — it opens the course, or the
   * service, once the payment lands. `type` is a public token, never the
   * backend's class name, so adding a product type does not change the order
   * shape or break an app already installed.
   *
   * `null` means this build does not know the token, which is exactly what an
   * older app sees after a new product type ships. Treat it as "show the order,
   * offer no shortcut", never as an error.
   */
  item: {
    type: 'course' | 'service' | null;
    id: number;
  };
  amount_cents: number;
  currency: string;
  status: OrderStatus;
  paid_at: string | null;
  payments?: StudentPayment[];
  created_at: string;
}

/**
 * What `POST /student/courses/{course}/enrol` returns.
 *
 * One endpoint covers both cases so the app never has to decide which applies:
 * a free course comes back `enrolled`, a paid one comes back `payment_required`
 * with the order to pay against. The price is read from the course on the
 * server — the app never sends an amount.
 */
export interface EnrolResult {
  status: 'enrolled' | 'payment_required';
  order: StudentOrder | null;
  enrolled_at?: string;
}

/**
 * Everything needed to hand the student to the gateway's own hosted checkout.
 *
 * `fields` is present because some gateways (PayHere) expect a signed form POST
 * rather than a plain redirect. The client posts them exactly as given; it never
 * builds or signs anything, and it never sees a card number.
 */
export interface CheckoutSession {
  gateway: string;
  checkout_url: string;
  fields: Record<string, string>;
  completed_immediately: boolean;
  /**
   * The one field a client should act on: always a plain URL to open, even for
   * gateways whose real checkout is a signed form POST (those are bridged by a
   * short-lived signed page on our own server, so no client ever handles a
   * payment hash).
   */
  redirect_url: string;
}

export interface CardCheckoutResult {
  payment_id: number;
  order: StudentOrder;
  checkout: CheckoutSession;
}

/** Where to send the money. Not secret — the student cannot pay without it. */
export interface BankTransferDetails {
  enabled: boolean;
  account: {
    bank_name: string | null;
    account_name: string | null;
    account_number: string | null;
    branch: string | null;
  };
  max_receipt_mb: number;
}
