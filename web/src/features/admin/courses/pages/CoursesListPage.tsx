import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FilterCard, FilterField } from '@/components/shared/FilterCard';
import { getCourseColumns } from '@/features/admin/courses/components/courseColumns';
import {
  useCourseProgrammes,
  useDeleteCourseProgramme,
  useToggleCoursePublished,
} from '@/features/admin/courses/hooks/useCourses';
import { useCourseCategories } from '@/features/admin/courseCategories/hooks/useCourseCategories';
import { paths } from '@/routes/paths';
import type { CourseProgramme, CourseProgrammeListFilters } from '@shared/types/course';

type StatusFilter = NonNullable<CourseProgrammeListFilters['status']>;
type CategoryFilter = NonNullable<CourseProgrammeListFilters['course_category_id']>;

const DEFAULT_STATUS: StatusFilter = 'all';
const DEFAULT_CATEGORY: CategoryFilter = 'all';

export function CoursesListPage() {
  const navigate = useNavigate();

  const [draftSearch, setDraftSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [draftCategory, setDraftCategory] = useState<CategoryFilter>(DEFAULT_CATEGORY);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [appliedCategory, setAppliedCategory] = useState<CategoryFilter>(DEFAULT_CATEGORY);

  const [sort, setSort] = useState<CourseProgrammeListFilters['sort']>('sort_order');
  const [direction, setDirection] = useState<CourseProgrammeListFilters['direction']>('asc');
  const [page, setPage] = useState(1);

  const [publishTarget, setPublishTarget] = useState<CourseProgramme | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseProgramme | null>(null);

  const activeFilterCount = [
    appliedSearch.trim() !== '',
    appliedStatus !== DEFAULT_STATUS,
    appliedCategory !== DEFAULT_CATEGORY,
  ].filter(Boolean).length;

  const filters: CourseProgrammeListFilters = useMemo(
    () => ({
      search: appliedSearch.trim() || undefined,
      status: appliedStatus,
      course_category_id: appliedCategory,
      sort,
      direction,
      page,
      per_page: 15,
    }),
    [appliedSearch, appliedStatus, appliedCategory, sort, direction, page],
  );

  const { data, isLoading, isFetching } = useCourseProgrammes(filters);
  const { data: categoryOptions } = useCourseCategories({
    is_active: 'all',
    sort: 'name',
    direction: 'asc',
    per_page: 100,
  });
  const togglePublished = useToggleCoursePublished();
  const deleteCourse = useDeleteCourseProgramme();

  const applyFilters = () => {
    setAppliedSearch(draftSearch);
    setAppliedStatus(draftStatus);
    setAppliedCategory(draftCategory);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftSearch('');
    setDraftStatus(DEFAULT_STATUS);
    setDraftCategory(DEFAULT_CATEGORY);
    setAppliedSearch('');
    setAppliedStatus(DEFAULT_STATUS);
    setAppliedCategory(DEFAULT_CATEGORY);
    setPage(1);
  };

  const handleSort = (columnId: string) => {
    if (sort === columnId) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(columnId as CourseProgrammeListFilters['sort']);
      setDirection('asc');
    }
    setPage(1);
  };

  const columns = useMemo(
    () =>
      getCourseColumns({
        onEdit: (programme) => navigate(paths.admin.courseEdit(programme.id)),
        onEditPaper: (programme) => navigate(paths.admin.coursePaper(programme.id)),
        onTogglePublished: (programme) => setPublishTarget(programme),
        onDelete: (programme) => setDeleteTarget(programme),
      }),
    [navigate],
  );

  const publishTargetIsLive = publishTarget?.status === 'published';

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Build each course programme from topics, videos and descriptions.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate(paths.admin.courseNew)}>
          <Plus className="size-3.5" /> Add course
        </Button>
      </div>

      <FilterCard activeCount={activeFilterCount} onApply={applyFilters} onClear={clearFilters}>
        <FilterField label="Search" className="sm:min-w-64">
          <Input
            placeholder="Course programme name…"
            className="h-8 text-sm"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </FilterField>

        <FilterField label="Category">
          <Select
            value={String(draftCategory)}
            onValueChange={(v) => setDraftCategory(v === 'all' ? 'all' : Number(v))}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions?.data.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Status">
          <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v as StatusFilter)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
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
        onRowClick={(programme) => navigate(paths.admin.courseEdit(programme.id))}
        emptyState={
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Create your first course programme and add topics to it."
            action={
              <Button size="sm" onClick={() => navigate(paths.admin.courseNew)}>
                <Plus className="size-3.5" /> Add course
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

      <ConfirmDialog
        open={!!publishTarget}
        onOpenChange={(open) => !open && setPublishTarget(null)}
        title={publishTargetIsLive ? 'Move this course back to draft?' : 'Publish this course?'}
        description={
          publishTargetIsLive
            ? `${publishTarget?.name} will be hidden from students until you publish it again.`
            : `${publishTarget?.name} will become visible to students.`
        }
        confirmLabel={publishTargetIsLive ? 'Move to draft' : 'Publish'}
        isLoading={togglePublished.isPending}
        onConfirm={() => {
          if (!publishTarget) return;
          togglePublished.mutate(
            { id: publishTarget.id, publish: !publishTargetIsLive },
            { onSuccess: () => setPublishTarget(null) },
          );
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this course?"
        description={`${deleteTarget?.name} and its topics will be removed from the list. Video files are kept, so this can be undone by a developer if it was a mistake.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteCourse.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCourse.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
