import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, PowerOff, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/shared/RowActions';
import { formatDate } from '@/lib/formatters';
import type { Profession } from '@shared/types/profession';

interface ProfessionColumnActions {
  onEdit: (profession: Profession) => void;
  onToggleActive: (profession: Profession) => void;
}

export function getProfessionColumns({ onEdit, onToggleActive }: ProfessionColumnActions): ColumnDef<Profession>[] {
  return [
    {
      id: 'name',
      header: 'Profession',
      meta: { sortId: 'name' },
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'industry',
      header: 'Industry',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.industry?.name ?? '—'}</span>,
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
        const profession = row.original;
        return (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => onEdit(profession) },
              {
                label: profession.is_active ? 'Deactivate' : 'Activate',
                icon: profession.is_active ? PowerOff : Power,
                onClick: () => onToggleActive(profession),
              },
            ]}
          />
        );
      },
    },
  ];
}
