import { useEffect, useState, type ReactNode } from 'react';
import { Check, Loader2, Play, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_VARIANTS,
} from '@/features/admin/services/components/servicePurchaseColumns';
import { useAdvanceServicePurchase, useServicePurchase } from '@/features/admin/services/hooks/useServicePurchases';
import { formatDateTime, formatMoney } from '@shared/lib/formatters';
import type { ServicePurchase, ServicePurchaseStatus } from '@shared/types/service';

interface ServicePurchaseDetailSheetProps {
  purchase: ServicePurchase | null;
  onOpenChange: (open: boolean) => void;
  /** False for roles that may read the queue but not work it. */
  canHandle: boolean;
}

const ACTION_ICONS: Record<ServicePurchaseStatus, typeof Check> = {
  pending: Play,
  in_progress: Play,
  completed: Check,
  cancelled: X,
};

const ACTION_LABELS: Record<ServicePurchaseStatus, string> = {
  pending: 'Move back to waiting',
  in_progress: 'Start work',
  completed: 'Mark completed',
  cancelled: 'Cancel request',
};

/**
 * Detail panel sliding from the right (CLAUDE.md §8 Admin UX) rather than a
 * separate page: advancing a request is a quick decision made against a queue,
 * and losing the list behind it would make working through the queue slower.
 */
export function ServicePurchaseDetailSheet({ purchase, onOpenChange, canHandle }: ServicePurchaseDetailSheetProps) {
  const { data: detail, isLoading } = useServicePurchase(purchase?.id ?? null);
  const advance = useAdvanceServicePurchase();
  const [note, setNote] = useState('');

  // A note belongs to one decision, so it is cleared whenever the panel opens
  // on a different request.
  useEffect(() => {
    setNote('');
  }, [purchase?.id]);

  const move = (status: ServicePurchaseStatus) => {
    if (!detail) return;

    advance.mutate({ id: detail.id, status, note: note.trim() || undefined }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Sheet open={!!purchase} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-base">{purchase?.title}</SheetTitle>
          <SheetDescription className="font-mono">{purchase?.order?.order_number}</SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="space-y-3 p-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}

        {detail && (
          <div className="space-y-4 p-4 pt-0">
            <div className="space-y-2 rounded-lg border p-3">
              <Row label="Status">
                <Badge variant={PURCHASE_STATUS_VARIANTS[detail.status]}>{PURCHASE_STATUS_LABELS[detail.status]}</Badge>
              </Row>
              <Row label="Student">
                <span className="text-right">
                  {detail.student?.full_name ?? '—'}
                  <span className="block font-mono text-xs text-muted-foreground">{detail.student?.student_id}</span>
                </span>
              </Row>
              {detail.order && (
                <Row label="Paid">
                  <span className="font-medium tabular-nums">
                    {formatMoney(detail.order.amount_cents, detail.order.currency)}
                  </span>
                </Row>
              )}
              <Row label="Purchased">{formatDateTime(detail.purchased_at)}</Row>
              {detail.started_at && <Row label="Started">{formatDateTime(detail.started_at)}</Row>}
              {detail.completed_at && <Row label="Completed">{formatDateTime(detail.completed_at)}</Row>}
              {detail.cancelled_at && <Row label="Cancelled">{formatDateTime(detail.cancelled_at)}</Row>}
              {detail.handled_by && <Row label="Handled by">{detail.handled_by}</Row>}
            </div>

            {detail.admin_note && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Internal note</p>
                <p className="rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">{detail.admin_note}</p>
              </div>
            )}

            {detail.allowed_transitions.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                This request is closed. Its history cannot be changed.
              </p>
            ) : !canHandle ? (
              <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                Only a Super Admin or Support Agent can update a request.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Update this request
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="purchase-note" className="text-xs">
                    Internal note{' '}
                    <span className="text-muted-foreground">(optional — the student never sees this)</span>
                  </Label>
                  <Textarea
                    id="purchase-note"
                    rows={2}
                    placeholder="e.g. First draft sent to the writer"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    disabled={advance.isPending}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {detail.allowed_transitions.map((status) => {
                    const Icon = ACTION_ICONS[status];
                    const isCancel = status === 'cancelled';

                    return (
                      <Button
                        key={status}
                        size="sm"
                        variant={isCancel ? 'outline' : status === 'completed' ? 'default' : 'secondary'}
                        disabled={advance.isPending}
                        onClick={() => move(status)}
                        className={isCancel ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' : ''}
                      >
                        {advance.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Icon className="size-3.5" />
                        )}
                        {ACTION_LABELS[status]}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}
