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
  useToggleCourseCategoryActive,
} from '@/features/admin/courseCategories/hooks/useCourseCategories';
import { getCourseCategoryColumns } from '@/features/admin/courseCategories/components/courseCategoryColumns';
import { CourseCategoryFormDialog } from '@/features/admin/courseCategories/components/CourseCategoryFormDialog';
import type { CourseCategory, CourseCategoryListFilters } from '@/types/course';

type StatusFilter = NonNullable<CourseCategoryListFilters['is_active']>;

const DEFAULT_STATUS: StatusFilter = 'all';

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
  const [toggleTarget, setToggleTarget] = useState<CourseCategory | null>(null);

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
  const toggleActive = useToggleCourseCategoryActive();

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

  const openCreate = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const columns = useMemo(
    () =>
      getCourseCategoryColumns({
        onEdit: (category) => {
          setEditingCategory(category);
          setFormOpen(true);
        },
        onToggleActive: (category) => setToggleTarget(category),
      }),
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Course categories</h1>
          <p className="text-sm text-muted-foreground">Group courses so students can find the right programme.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" /> Add category
        </Button>
      </div>

      <FilterCard activeCount={activeFilterCount} onApply={applyFilters} onClear={clearFilters}>
        <FilterField label="Search" className="sm:min-w-64">
          <Input
            placeholder="Category name…"
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
              <Button size="sm" onClick={openCreate}>
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

      <CourseCategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editingCategory} />

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.is_active ? 'Deactivate this category?' : 'Activate this category?'}
        description={
          toggleTarget?.is_active
            ? `${toggleTarget?.name} will no longer appear when creating a course. Existing courses keep it.`
            : `${toggleTarget?.name} will be selectable again on the Course form.`
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
    </div>
  );
}
