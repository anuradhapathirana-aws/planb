import type { ColumnDef } from '@tanstack/react-table';
import { CreditCard, Eye, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/shared/RowActions';
import { formatDate, formatMoney } from '@shared/lib/formatters';
import type { Order, OrderStatus } from '@shared/types/order';

/** One label per status, so the same word appears everywhere in the panel. */
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Awaiting payment',
  awaiting_verification: 'Awaiting verification',
  paid: 'Paid',
  cancelled: 'Cancelled',
  failed: 'Failed',
  refunded: 'Refunded',
};

const STATUS_VARIANTS: Record<OrderStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  awaiting_verification: 'warning',
  paid: 'success',
  cancelled: 'secondary',
  failed: 'destructive',
  refunded: 'secondary',
};

export function getOrderColumns({ onView }: { onView: (order: Order) => void }): ColumnDef<Order>[] {
  return [
    {
      id: 'order_number',
      header: 'Order',
      meta: { sortId: 'order_number' },
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="font-mono text-[13px] font-medium">{row.original.order_number}</span>
          <p className="line-clamp-1 text-xs text-muted-foreground" title={row.original.title}>
            {row.original.title}
          </p>
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
      id: 'amount_cents',
      header: 'Amount',
      meta: { sortId: 'amount_cents' },
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">
          {formatMoney(row.original.amount_cents, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'method',
      header: 'Method',
      cell: ({ row }) => {
        // The latest attempt is what the row is about; earlier ones are history.
        const latest = row.original.payments?.[0];
        if (!latest) return <span className="text-sm text-muted-foreground">—</span>;

        const isBank = latest.method === 'bank_transfer';
        const Icon = isBank ? Landmark : CreditCard;

        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon className="size-3.5" aria-hidden="true" />
            {isBank ? 'Bank transfer' : 'Card'}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANTS[row.original.status]}>{STATUS_LABELS[row.original.status]}</Badge>
      ),
    },
    {
      id: 'created_at',
      header: 'Placed',
      meta: { sortId: 'created_at' },
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.created_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      meta: { sticky: 'right' },
      cell: ({ row }) => (
        <RowActions actions={[{ label: 'View order', icon: Eye, onClick: () => onView(row.original) }]} />
      ),
    },
  ];
}

export { STATUS_LABELS, STATUS_VARIANTS };
