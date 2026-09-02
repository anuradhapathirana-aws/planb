import type { ColumnDef } from '@tanstack/react-table';
import { Clock, Eye, EyeOff, Pencil, ShoppingBag, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ImagePlaceholder } from '@/components/shared/ImageDropzone';
import { RowActions } from '@/components/shared/RowActions';
import { formatDate, formatMoney } from '@shared/lib/formatters';
import type { Service } from '@shared/types/service';

interface ServiceColumnActions {
  onEdit: (service: Service) => void;
  onViewPurchases: (service: Service) => void;
  onTogglePublished: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export function getServiceColumns({
  onEdit,
  onViewPurchases,
  onTogglePublished,
  onDelete,
}: ServiceColumnActions): ColumnDef<Service>[] {
  return [
    {
      id: 'name',
      header: 'Service',
      meta: { sortId: 'name' },
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2.5">
          {row.original.thumbnail_url ? (
            <img
              src={row.original.thumbnail_url}
              alt=""
              className="h-9 w-16 shrink-0 rounded object-cover"
              loading="lazy"
            />
          ) : (
            <ImagePlaceholder className="h-9 w-16 shrink-0" />
          )}
          <div className="min-w-0">
            <span className="font-medium">{row.original.name}</span>
            {row.original.summary && (
              <p className="line-clamp-1 text-xs text-muted-foreground" title={row.original.summary}>
                {row.original.summary}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'price_cents',
      header: 'Price',
      meta: { sortId: 'price_cents' },
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">
          {formatMoney(row.original.price_cents, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'delivery_time',
      header: 'Delivery',
      cell: ({ row }) =>
        row.original.delivery_time ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            {row.original.delivery_time}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      id: 'purchases',
      header: 'Purchases',
      cell: ({ row }) => {
        const total = row.original.purchases_count ?? 0;
        const open = row.original.open_purchases_count ?? 0;

        return (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1" title="Total purchases">
              <ShoppingBag className="size-3.5" aria-hidden="true" />
              {total}
            </span>
            {open > 0 && <Badge variant="warning">{open} waiting</Badge>}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'published' ? 'success' : 'secondary'}>
          {row.original.status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      id: 'created_at',
      header: 'Created',
      meta: { sortId: 'created_at' },
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.created_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      meta: { sticky: 'right' },
      cell: ({ row }) => {
        const service = row.original;
        const isPublished = service.status === 'published';

        return (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => onEdit(service) },
              { label: 'Purchases', icon: ShoppingBag, onClick: () => onViewPurchases(service) },
              {
                label: isPublished ? 'Move to draft' : 'Publish',
                icon: isPublished ? EyeOff : Eye,
                onClick: () => onTogglePublished(service),
              },
              {
                label: 'Delete',
                icon: Trash2,
                variant: 'destructive',
                onClick: () => onDelete(service),
              },
            ]}
          />
        );
      },
    },
  ];
}
