import { useMemo, useState } from 'react';
import { FolderTree, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FilterCard, FilterField } from '@/components/shared/FilterCard';
import {
  useCourseCategories,
  useCourseCategoryTree,
  useDeleteCourseCategory,
  useToggleCourseCategoryActive,
} from '@/features/admin/courseCategories/hooks/useCourseCategories';
import {
  branchCourseCount,
  getCourseCategoryColumns,
} from '@/features/admin/courseCategories/components/courseCategoryColumns';
import { CourseCategoryFormDialog } from '@/features/admin/courseCategories/components/CourseCategoryFormDialog';
import type { CourseCategory, CourseCategoryListFilters } from '@shared/types/course';

type StatusFilter = NonNullable<CourseCategoryListFilters['is_active']>;

const DEFAULT_STATUS: StatusFilter = 'all';

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** What deactivating does, in the admin's terms — it differs for a main category. */
function deactivateDescription(category: CourseCategory): string {
  const children = category.children?.length ?? 0;

  if (category.parent_id === null && children > 0) {
    return (
      `${category.name}, its ${plural(children, 'sub-category', 'sub-categories')} and every course in them ` +
      'will be hidden from students and can no longer be bought. Students already enrolled keep their courses.'
    );
  }

  return (
    `${category.name} and its courses will be hidden from students and can no longer be bought. ` +
    'Students already enrolled keep their courses.'
  );
}

function deleteDescription(category: CourseCategory): string {
  const children = category.children?.length ?? 0;
  const courses = category.parent_id === null ? branchCourseCount(category) : (category.programmes_count ?? 0);
  const parts = [
    children > 0 ? plural(children, 'sub-category', 'sub-categories') : null,
    courses > 0 ? plural(courses, 'course', 'courses') : null,
  ].filter(Boolean);

  const also = parts.length > 0 ? ` This also deletes ${parts.join(' and ')}, with their lesson videos.` : '';

  return (
    `${category.name} will be deleted.${also} If any student is enrolled or paying, the delete is refused — ` +
    'deactivate the category instead.'
  );
}

export function CourseCategoriesListPage() {
  const [draftSearch, setDraftSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(DEFAULT_STATUS);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>(DEFAULT_STATUS);

  const [sort, setSort] = useState<CourseCategoryListFilters['sort']>('sort_order');
  const [direction, setDirection] = useState<CourseCategoryListFilters['direction']>('asc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [toggleTarget, setToggleTarget] = useState<CourseCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseCategory | null>(null);

  const activeFilterCount = [appliedSearch.trim() !== '', appliedStatus !== DEFAULT_STATUS].filter(Boolean).length;

  const filters: CourseCategoryListFilters = useMemo(
    () => ({
      search: appliedSearch.trim() || undefined,
      is_active: appliedStatus,
      sort,
      direction,
      page,
      per_page: 15,
    }),
    [appliedSearch, appliedStatus, sort, direction, page],
  );

  const { data, isLoading, isFetching } = useCourseCategories(filters);
  // Every main category, for the dialog's "Place under" select — not just this page's.
  const { data: tree } = useCourseCategoryTree();
  const toggleActive = useToggleCourseCategoryActive();
  const deleteCategory = useDeleteCourseCategory();

  const applyFilters = () => {
    setAppliedSearch(draftSearch);
    setAppliedStatus(draftStatus);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftSearch('');
    setDraftStatus(DEFAULT_STATUS);
    setAppliedSearch('');
    setAppliedStatus(DEFAULT_STATUS);
    setPage(1);
  };

  const handleSort = (columnId: string) => {
    if (sort === columnId) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(columnId as CourseCategoryListFilters['sort']);
      setDirection('asc');
    }
    setPage(1);
  };

  const openCreate = (parentId: number | null) => {
    setEditingCategory(null);
    setNewParentId(parentId);
    setFormOpen(true);
  };

  const columns = useMemo(
    () =>
      getCourseCategoryColumns({
        onAddChild: (parent) => openCreate(parent.id),
        onEdit: (category) => {
          setEditingCategory(category);
          setFormOpen(true);
        },
        onToggleActive: (category) => setToggleTarget(category),
        onDelete: (category) => setDeleteTarget(category),
      }),
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Course categories</h1>
          <p className="text-sm text-muted-foreground">
            Group courses into main categories and sub-categories, e.g. Migration › UAE.
          </p>
        </div>
        <Button size="sm" onClick={() => openCreate(null)}>
          <Plus className="size-3.5" /> Add category
        </Button>
      </div>

      <FilterCard activeCount={activeFilterCount} onApply={applyFilters} onClear={clearFilters}>
        <FilterField label="Search" className="sm:min-w-64">
          <Input
            placeholder="Category or sub-category name…"
            className="h-8 text-sm"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </FilterField>

        <FilterField label="Status">
          <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v as StatusFilter)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="1">Active</SelectItem>
              <SelectItem value="0">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      </FilterCard>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getSubRows={(category) => category.children}
        // An inactive parent greys out with its whole branch, matching what students see.
        getRowClassName={(row) => {
          const parent = row.getParentRow()?.original;
          return !row.original.is_active || (parent && !parent.is_active) ? 'text-muted-foreground' : undefined;
        }}
        isLoading={isLoading || isFetching}
        sortBy={sort}
        sortDirection={direction}
        onSortChange={handleSort}
        emptyState={
          <EmptyState
            icon={FolderTree}
            title="No categories yet"
            description="Add a category before creating your first course."
            action={
              <Button size="sm" onClick={() => openCreate(null)}>
                <Plus className="size-3.5" /> Add category
              </Button>
            }
          />
        }
      />

      {data && data.meta.total > 0 && (
        <Pagination
          currentPage={data.meta.current_page}
          lastPage={data.meta.last_page}
          total={data.meta.total}
          perPage={data.meta.per_page}
          onPageChange={setPage}
        />
      )}

      <CourseCategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        defaultParentId={newParentId}
        parents={tree ?? []}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.is_active ? 'Deactivate this category?' : 'Activate this category?'}
        description={
          toggleTarget
            ? toggleTarget.is_active
              ? deactivateDescription(toggleTarget)
              : `${toggleTarget.name} and its courses will be shown to students again.`
            : ''
        }
        confirmLabel={toggleTarget?.is_active ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.is_active ? 'destructive' : 'default'}
        isLoading={toggleActive.isPending}
        onConfirm={() => {
          if (!toggleTarget) return;
          toggleActive.mutate(
            { id: toggleTarget.id, activate: !toggleTarget.is_active },
            { onSuccess: () => setToggleTarget(null) },
          );
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.parent_id ? 'Delete this sub-category?' : 'Delete this category?'}
        description={deleteTarget ? deleteDescription(deleteTarget) : ''}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteCategory.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          // Closed either way: on a refusal the toast carries the reason.
          deleteCategory.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
