export type OrderStatus = 'pending' | 'awaiting_verification' | 'paid' | 'cancelled' | 'failed' | 'refunded';

export type PaymentMethod = 'card' | 'bank_transfer';

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export interface Payment {
  id: number;
  order_id: number;
  method: PaymentMethod;
  gateway: string | null;
  gateway_reference: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  /** Student-entered bank reference. Null for card payments. */
  reference_number: string | null;
  receipt_url: string | null;
  /** True while this bank transfer is sitting in the admin queue. */
  is_awaiting_review: boolean;
  review_remark: string | null;
  reviewed_at: string | null;
  reviewed_by?: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  student_id: number;
  student?: {
    id: number;
    student_id: string;
    full_name: string | null;
    email: string | null;
  };
  /** What was bought, frozen at purchase time. */
  title: string;
  purchasable_type: string;
  purchasable_id: number;
  amount_cents: number;
  currency: string;
  status: OrderStatus;
  paid_at: string | null;
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface OrderListFilters {
  search?: string;
  status?: OrderStatus | 'all';
  method?: PaymentMethod | 'all';
  student_id?: number;
  sort?: 'created_at' | 'amount_cents' | 'order_number';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface OrderStats {
  pending_bank_transfers: number;
  paid_orders: number;
  revenue_cents_this_month: number;
  currency: string;
}
