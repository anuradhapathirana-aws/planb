import { useEffect, useState } from 'react';
import { Check, CreditCard, ExternalLink, Landmark, Loader2, Receipt, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { STATUS_LABELS, STATUS_VARIANTS } from '@/features/admin/orders/components/orderColumns';
import { useOrder, useReviewBankTransfer } from '@/features/admin/orders/hooks/useOrders';
import { formatDateTime, formatMoney } from '@shared/lib/formatters';
import type { Order, Payment } from '@shared/types/order';

interface OrderDetailSheetProps {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
  /** False for roles that may read the queue but not decide on it. */
  canReview: boolean;
}

const PAYMENT_STATUS_LABELS: Record<Payment['status'], string> = {
  pending: 'Awaiting verification',
  processing: 'In progress',
  succeeded: 'Approved',
  failed: 'Rejected',
  cancelled: 'Cancelled',
};

/**
 * Detail panel sliding from the right (CLAUDE.md §8 Admin UX) rather than a
 * separate page: verifying a transfer is a quick decision made against a queue,
 * and losing the list behind it would make working through the queue slower.
 */
export function OrderDetailSheet({ order, onOpenChange, canReview }: OrderDetailSheetProps) {
  const { data: detail, isLoading } = useOrder(order?.id ?? null);
  const review = useReviewBankTransfer();
  const [remark, setRemark] = useState('');

  // A remark belongs to one decision, so it is cleared whenever the panel opens
  // on a different order.
  useEffect(() => {
    setRemark('');
  }, [order?.id]);

  const payments = detail?.payments ?? [];
  const awaiting = payments.find((payment) => payment.is_awaiting_review);

  const decide = (approve: boolean) => {
    if (!awaiting) return;

    review.mutate(
      { paymentId: awaiting.id, approve, remark: remark.trim() || undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Sheet open={!!order} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-mono text-base">{order?.order_number}</SheetTitle>
          <SheetDescription>{order?.title}</SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="space-y-3 p-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {detail && (
          <div className="space-y-4 p-4 pt-0">
            {/* Summary */}
            <div className="space-y-2 rounded-lg border p-3">
              <Row label="Status">
                <Badge variant={STATUS_VARIANTS[detail.status]}>{STATUS_LABELS[detail.status]}</Badge>
              </Row>
              <Row label="Amount">
                <span className="font-medium tabular-nums">{formatMoney(detail.amount_cents, detail.currency)}</span>
              </Row>
              <Row label="Student">
                <span className="text-right">
                  {detail.student?.full_name ?? '—'}
                  <span className="block font-mono text-xs text-muted-foreground">{detail.student?.student_id}</span>
                </span>
              </Row>
              <Row label="Placed">{formatDateTime(detail.created_at)}</Row>
              {detail.paid_at && <Row label="Paid">{formatDateTime(detail.paid_at)}</Row>}
            </div>

            {/* Payment attempts — newest first. A rejected transfer stays visible
                so the history of what was tried is not lost. */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Payment attempts ({payments.length})
              </p>

              {payments.length === 0 && (
                <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                  No payment has been attempted yet.
                </p>
              )}

              {payments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>

            {/* Verification (FR-ADM-020) */}
            {awaiting && (
              <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Verify this transfer
                </p>

                {!canReview ? (
                  <p className="text-xs text-muted-foreground">
                    Only a Super Admin or Accountant can approve or reject a payment.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Check the reference against your bank statement before approving. Approving gives the student
                      immediate access to the course.
                    </p>

                    <div className="space-y-1.5">
                      <Label htmlFor="review-remark" className="text-xs">
                        Remark <span className="text-muted-foreground">(optional — the student sees this)</span>
                      </Label>
                      <Textarea
                        id="review-remark"
                        rows={2}
                        placeholder="e.g. Reference not found on the statement"
                        value={remark}
                        onChange={(event) => setRemark(event.target.value)}
                        disabled={review.isPending}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" disabled={review.isPending} onClick={() => decide(true)}>
                        {review.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        Approve payment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={review.isPending}
                        onClick={() => decide(false)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-3.5" /> Reject
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PaymentCard({ payment }: { payment: Payment }) {
  const isBank = payment.method === 'bank_transfer';
  const Icon = isBank ? Landmark : CreditCard;

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {isBank ? 'Bank transfer' : 'Card payment'}
        </span>
        <Badge
          variant={
            payment.status === 'succeeded' ? 'success' : payment.status === 'failed' ? 'destructive' : 'secondary'
          }
        >
          {PAYMENT_STATUS_LABELS[payment.status]}
        </Badge>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <Row label="Amount" small>
          {formatMoney(payment.amount_cents, payment.currency)}
        </Row>
        {payment.reference_number && (
          <Row label="Reference" small>
            <span className="font-mono">{payment.reference_number}</span>
          </Row>
        )}
        {payment.gateway_reference && (
          <Row label="Gateway ref" small>
            <span className="font-mono">{payment.gateway_reference}</span>
          </Row>
        )}
        <Row label="Submitted" small>
          {formatDateTime(payment.created_at)}
        </Row>
        {payment.reviewed_at && (
          <Row label="Reviewed" small>
            {formatDateTime(payment.reviewed_at)}
            {payment.reviewed_by ? ` · ${payment.reviewed_by}` : ''}
          </Row>
        )}
      </div>

      {payment.review_remark && (
        <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">{payment.review_remark}</p>
      )}

      {payment.receipt_url && (
        <Button asChild size="xs" variant="outline" className="w-full">
          <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
            <Receipt className="size-3.5" /> View receipt
            <ExternalLink className="size-3" />
          </a>
        </Button>
      )}
    </div>
  );
}

function Row({ label, children, small }: { label: string; children: React.ReactNode; small?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className={small ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>{label}</span>
      <span className={small ? 'text-right text-xs' : 'text-right text-sm'}>{children}</span>
    </div>
  );
}
