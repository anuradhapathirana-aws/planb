import type { ColumnDef } from '@tanstack/react-table';
import { ChevronRight, FolderPlus, Package, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/shared/RowActions';
import { CourseCategoryIconTile } from '@/features/admin/courseCategories/components/CourseCategoryIconTile';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CourseCategory } from '@shared/types/course';

interface CourseCategoryColumnActions {
  onAddChild: (parent: CourseCategory) => void;
  onEdit: (category: CourseCategory) => void;
  onToggleActive: (category: CourseCategory) => void;
  onDelete: (category: CourseCategory) => void;
}

/** Courses on a parent and on every sub-category under it. */
export function branchCourseCount(category: CourseCategory): number {
  return (
    (category.programmes_count ?? 0) +
    (category.children ?? []).reduce((sum, child) => sum + (child.programmes_count ?? 0), 0)
  );
}

/**
 * Columns for the category tree. Sub-categories are nested rows (`row.depth` 1),
 * indented under their parent with a connector line so the tree reads at a glance.
 */
export function getCourseCategoryColumns({
  onAddChild,
  onEdit,
  onToggleActive,
  onDelete,
}: CourseCategoryColumnActions): ColumnDef<CourseCategory>[] {
  return [
    {
      id: 'name',
      header: 'Category',
      meta: { sortId: 'name' },
      cell: ({ row }) => {
        const category = row.original;
        const isChild = row.depth > 0;
        const childCount = category.children?.length ?? 0;

        return (
          <div className={cn('flex min-w-0 items-center gap-2', isChild && 'pl-4')}>
            {isChild ? (
              // └ connector: ties the child to the parent row above it.
              <span aria-hidden className="-mt-4 h-6 w-4 shrink-0 rounded-bl-md border-b border-l border-border" />
            ) : childCount > 0 ? (
              <button
                type="button"
                onClick={row.getToggleExpandedHandler()}
                aria-label={row.getIsExpanded() ? `Collapse ${category.name}` : `Expand ${category.name}`}
                aria-expanded={row.getIsExpanded()}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <ChevronRight className={cn('size-4 transition-transform', row.getIsExpanded() && 'rotate-90')} />
              </button>
            ) : (
              <span aria-hidden className="size-6 shrink-0" />
            )}

            <CourseCategoryIconTile category={category} size={isChild ? 'sm' : 'md'} />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn('truncate', isChild ? 'text-sm' : 'font-medium')}>{category.name}</span>
                {!isChild && childCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                    {childCount} sub
                  </Badge>
                )}
              </div>
              {(category.name_si || category.description) && (
                <p
                  className="line-clamp-1 text-xs text-muted-foreground"
                  title={category.name_si ?? category.description ?? undefined}
                >
                  {category.name_si ?? category.description}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'programmes_count',
      header: 'Courses',
      cell: ({ row }) => {
        const category = row.original;
        const total = row.depth === 0 ? branchCourseCount(category) : (category.programmes_count ?? 0);
        const direct = category.programmes_count ?? 0;

        return (
          <span
            className="text-sm text-muted-foreground"
            // A parent's number includes its sub-categories; say so when it differs.
            title={total !== direct ? `${direct} directly in this category, ${total - direct} in sub-categories` : undefined}
          >
            {total}
          </span>
        );
      },
    },
    {
      id: 'selling',
      header: 'Selling',
      cell: ({ row }) => {
        const category = row.original;
        const parent = row.getParentRow()?.original;
        // A sub-category set to follow sells however its main category does.
        const follows = parent !== undefined && category.selling_mode === 'inherit';
        const mode = follows ? parent.selling_mode : category.selling_mode;

        return (
          <div className="flex items-center gap-1.5">
            {mode === 'bundle' ? (
              <Badge variant="secondary" title="Paid courses are sold together as one bundle">
                <Package className="size-3" /> {follows ? `${parent.name} bundle` : 'Bundle'}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">One by one</span>
            )}
            {follows && <span className="text-xs text-muted-foreground">(follows)</span>}
          </div>
        );
      },
    },
    {
      id: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const category = row.original;
        const parent = row.getParentRow()?.original;

        // Switched on itself, but hidden from students because its parent is off.
        if (category.is_active && parent && !parent.is_active) {
          return (
            <Badge variant="secondary" title="Hidden from students because the main category is inactive">
              Hidden
            </Badge>
          );
        }

        return (
          <Badge variant={category.is_active ? 'success' : 'secondary'}>
            {category.is_active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
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
        const isParent = row.depth === 0;

        return (
          <RowActions
            maxInline={4}
            actions={[
              {
                label: 'Add sub-category',
                icon: FolderPlus,
                onClick: () => onAddChild(category),
                hidden: !isParent,
              },
              { label: 'Edit', icon: Pencil, onClick: () => onEdit(category) },
              {
                label: category.is_active ? 'Deactivate' : 'Activate',
                icon: category.is_active ? PowerOff : Power,
                onClick: () => onToggleActive(category),
              },
              { label: 'Delete', icon: Trash2, onClick: () => onDelete(category), variant: 'destructive' },
            ]}
          />
        );
      },
    },
  ];
}
