import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FilterCard, FilterField } from '@/components/shared/FilterCard';
import {
  useDeleteStudent,
  useStudents,
  useToggleBlockStudent,
} from '@/features/admin/students/hooks/useStudents';
import { getStudentColumns } from '@/features/admin/students/components/studentColumns';
import { StudentFormDialog } from '@/features/admin/students/components/StudentFormDialog';
import { ImportStudentsDialog } from '@/features/admin/students/components/ImportStudentsDialog';
import type { Student, StudentListFilters } from '@shared/types/student';
import { paths } from '@/routes/paths';

type StatusFilter = NonNullable<StudentListFilters['status']>;
type VisaFilter = NonNullable<StudentListFilters['visa_status']>;

const DEFAULT_STATUS: StatusFilter = 'all';
const DEFAULT_VISA: VisaFilter = 'all';

export function StudentsListPage() {
  const navigate = useNavigate();

  // Draft = what's being edited inside the (collapsed-by-default) filter card.
  const [draftSearch, setDraftSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [draftVisaStatus, setDraftVisaStatus] = useState<VisaFilter>(DEFAULT_VISA);

  // Applied = what's actually sent to the API. Only updated on "Apply Filter".
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [appliedVisaStatus, setAppliedVisaStatus] = useState<VisaFilter>(DEFAULT_VISA);

  const [sort, setSort] = useState<StudentListFilters['sort']>('created_at');
  const [direction, setDirection] = useState<StudentListFilters['direction']>('desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [blockTarget, setBlockTarget] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const activeFilterCount = [
    appliedSearch.trim() !== '',
    appliedStatus !== DEFAULT_STATUS,
    appliedVisaStatus !== DEFAULT_VISA,
  ].filter(Boolean).length;

  const filters: StudentListFilters = useMemo(
    () => ({
      search: appliedSearch.trim() || undefined,
      status: appliedStatus,
      visa_status: appliedVisaStatus,
      sort,
      direction,
      page,
      per_page: 15,
    }),
    [appliedSearch, appliedStatus, appliedVisaStatus, sort, direction, page],
  );

  const { data, isLoading, isFetching } = useStudents(filters);
  const toggleBlock = useToggleBlockStudent();
  const deleteStudent = useDeleteStudent();

  const applyFilters = () => {
    setAppliedSearch(draftSearch);
    setAppliedStatus(draftStatus);
    setAppliedVisaStatus(draftVisaStatus);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftSearch('');
    setDraftStatus(DEFAULT_STATUS);
    setDraftVisaStatus(DEFAULT_VISA);
    setAppliedSearch('');
    setAppliedStatus(DEFAULT_STATUS);
    setAppliedVisaStatus(DEFAULT_VISA);
    setPage(1);
  };

  const handleSort = (columnId: string) => {
    if (sort === columnId) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(columnId as StudentListFilters['sort']);
      setDirection('asc');
    }
    setPage(1);
  };

  const columns = useMemo(
    () =>
      getStudentColumns({
        onEdit: (student) => {
          setEditingStudent(student);
          setFormOpen(true);
        },
        onToggleBlock: (student) => setBlockTarget(student),
        onDelete: (student) => setDeleteTarget(student),
      }),
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Students</h1>
          <p className="text-sm text-muted-foreground">Manage student records, pre-load Student IDs, and control access.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="size-3.5" /> Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingStudent(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Add student
          </Button>
        </div>
      </div>

      <FilterCard activeCount={activeFilterCount} onApply={applyFilters} onClear={clearFilters}>
        <FilterField label="Search" className="sm:min-w-64">
          <Input
            placeholder="Name, Student ID or email…"
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
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="pending">Pending registration</SelectItem>
              <SelectItem value="active">Active (not blocked)</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Visa status">
          <Select value={draftVisaStatus} onValueChange={(v) => setDraftVisaStatus(v as VisaFilter)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="visit">Visit</SelectItem>
              <SelectItem value="employment">Employment</SelectItem>
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
        onRowClick={(student) => navigate(paths.admin.studentDetail(student.id))}
        emptyState={
          <EmptyState
            icon={Users}
            title="No students found"
            description="Try adjusting your search or filters, or add a new student."
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="size-3.5" /> Add student
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

      <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} student={editingStudent} />
      <ImportStudentsDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmDialog
        open={!!blockTarget}
        onOpenChange={(open) => !open && setBlockTarget(null)}
        title={blockTarget?.is_blocked ? 'Unblock this student?' : 'Block this student?'}
        description={
          blockTarget?.is_blocked
            ? `${blockTarget?.full_name ?? blockTarget?.student_id} will regain access to the mobile app.`
            : `${blockTarget?.full_name ?? blockTarget?.student_id} will lose access to the mobile app immediately.`
        }
        confirmLabel={blockTarget?.is_blocked ? 'Unblock' : 'Block'}
        variant={blockTarget?.is_blocked ? 'default' : 'destructive'}
        isLoading={toggleBlock.isPending}
        onConfirm={() => {
          if (!blockTarget) return;
          toggleBlock.mutate(
            { id: blockTarget.id, block: !blockTarget.is_blocked },
            { onSuccess: () => setBlockTarget(null) },
          );
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this student record?"
        description={`This removes ${deleteTarget?.full_name ?? deleteTarget?.student_id} from the active list. This can be recovered by support if needed.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteStudent.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteStudent.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
