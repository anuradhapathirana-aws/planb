import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, PowerOff, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/shared/RowActions';
import { formatDate } from '@/lib/formatters';
import type { Industry } from '@shared/types/industry';

interface IndustryColumnActions {
  onEdit: (industry: Industry) => void;
  onToggleActive: (industry: Industry) => void;
}

export function getIndustryColumns({ onEdit, onToggleActive }: IndustryColumnActions): ColumnDef<Industry>[] {
  return [
    {
      id: 'name',
      header: 'Industry',
      meta: { sortId: 'name' },
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'professions_count',
      header: 'Professions',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.professions_count ?? 0}</span>,
    },
    {
      id: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
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
        const industry = row.original;
        return (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => onEdit(industry) },
              {
                label: industry.is_active ? 'Deactivate' : 'Activate',
                icon: industry.is_active ? PowerOff : Power,
                onClick: () => onToggleActive(industry),
              },
            ]}
          />
        );
      },
    },
  ];
}
