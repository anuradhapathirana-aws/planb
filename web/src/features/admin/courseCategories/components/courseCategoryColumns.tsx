import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Power, PowerOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/shared/RowActions';
import { formatDate } from '@/lib/formatters';
import type { CourseCategory } from '@/types/course';

interface CourseCategoryColumnActions {
  onEdit: (category: CourseCategory) => void;
  onToggleActive: (category: CourseCategory) => void;
}

export function getCourseCategoryColumns({
  onEdit,
  onToggleActive,
}: CourseCategoryColumnActions): ColumnDef<CourseCategory>[] {
  return [
    {
      id: 'name',
      header: 'Category',
      meta: { sortId: 'name' },
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="font-medium">{row.original.name}</span>
          {row.original.description && (
            <p className="line-clamp-1 text-xs text-muted-foreground" title={row.original.description}>
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'programmes_count',
      header: 'Courses',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.programmes_count ?? 0}</span>,
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
        const category = row.original;
        return (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, onClick: () => onEdit(category) },
              {
                label: category.is_active ? 'Deactivate' : 'Activate',
                icon: category.is_active ? PowerOff : Power,
                onClick: () => onToggleActive(category),
              },
            ]}
          />
        );
      },
    },
  ];
}
