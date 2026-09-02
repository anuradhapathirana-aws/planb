import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/shared/RowActions';
import { formatDate, formatMoney } from '@shared/lib/formatters';
import type { ServicePurchase, ServicePurchaseStatus } from '@shared/types/service';

/** One label per status, so the same word appears everywhere in the panel. */
const PURCHASE_STATUS_LABELS: Record<ServicePurchaseStatus, string> = {
  pending: 'Waiting to start',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PURCHASE_STATUS_VARIANTS: Record<ServicePurchaseStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  pending: 'warning',
  in_progress: 'secondary',
  completed: 'success',
  cancelled: 'destructive',
};

export function getServicePurchaseColumns({
  onView,
}: {
  onView: (purchase: ServicePurchase) => void;
}): ColumnDef<ServicePurchase>[] {
  return [
    {
      id: 'title',
      header: 'Service',
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="font-medium">{row.original.title}</span>
          <p className="font-mono text-xs text-muted-foreground">{row.original.order?.order_number ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'student',
      header: 'Student',
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="text-sm">{row.original.student?.full_name ?? '—'}</span>
          <p className="font-mono text-xs text-muted-foreground">{row.original.student?.student_id ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Paid',
      cell: ({ row }) =>
        row.original.order ? (
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(row.original.order.amount_cents, row.original.order.currency)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { sortId: 'status' },
      cell: ({ row }) => (
        <Badge variant={PURCHASE_STATUS_VARIANTS[row.original.status]}>
          {PURCHASE_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'handled_by',
      header: 'Handled by',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.handled_by ?? '—'}</span>,
    },
    {
      id: 'purchased_at',
      header: 'Purchased',
      meta: { sortId: 'purchased_at' },
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.purchased_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      meta: { sticky: 'right' },
      cell: ({ row }) => (
        <RowActions actions={[{ label: 'View request', icon: Eye, onClick: () => onView(row.original) }]} />
      ),
    },
  ];
}

export { PURCHASE_STATUS_LABELS, PURCHASE_STATUS_VARIANTS };
