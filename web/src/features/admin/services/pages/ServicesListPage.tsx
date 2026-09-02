import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { FilterCard, FilterField } from '@/components/shared/FilterCard';
import { Pagination } from '@/components/shared/Pagination';
import { getServiceColumns } from '@/features/admin/services/components/serviceColumns';
import { useDeleteService, useServices, useToggleServicePublished } from '@/features/admin/services/hooks/useServices';
import { paths } from '@/routes/paths';
import type { Service, ServiceListFilters } from '@shared/types/service';

type StatusFilter = NonNullable<ServiceListFilters['status']>;

const DEFAULT_STATUS: StatusFilter = 'all';

export function ServicesListPage() {
  const navigate = useNavigate();

  const [draftSearch, setDraftSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(DEFAULT_STATUS);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>(DEFAULT_STATUS);

  const [sort, setSort] = useState<ServiceListFilters['sort']>('sort_order');
  const [direction, setDirection] = useState<ServiceListFilters['direction']>('asc');
  const [page, setPage] = useState(1);

  const [publishTarget, setPublishTarget] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const activeFilterCount = [appliedSearch.trim() !== '', appliedStatus !== DEFAULT_STATUS].filter(Boolean).length;

  const filters: ServiceListFilters = useMemo(
    () => ({
      search: appliedSearch.trim() || undefined,
      status: appliedStatus,
      sort,
      direction,
      page,
      per_page: 15,
    }),
    [appliedSearch, appliedStatus, sort, direction, page],
  );

  const { data, isLoading, isFetching } = useServices(filters);
  const togglePublished = useToggleServicePublished();
  const removeService = useDeleteService();

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
      setSort(columnId as ServiceListFilters['sort']);
      setDirection('asc');
    }
    setPage(1);
  };

  const columns = useMemo(
    () =>
      getServiceColumns({
        onEdit: (service) => navigate(paths.admin.serviceEdit(service.id)),
        onViewPurchases: (service) => navigate(`${paths.admin.servicePurchases}?service=${service.id}`),
        onTogglePublished: (service) => setPublishTarget(service),
        onDelete: (service) => setDeleteTarget(service),
      }),
    [navigate],
  );

  const publishTargetIsLive = publishTarget?.status === 'published';

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Services</h1>
          <p className="text-sm text-muted-foreground">
            Paid one-off help students can buy — CV writing, consultations and the like.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate(paths.admin.serviceNew)}>
          <Plus className="size-3.5" /> Add service
        </Button>
      </div>

      <FilterCard activeCount={activeFilterCount} onApply={applyFilters} onClear={clearFilters}>
        <FilterField label="Search" className="sm:min-w-64">
          <Input
            placeholder="Service name…"
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
        onRowClick={(service) => navigate(paths.admin.serviceEdit(service.id))}
        emptyState={
          <EmptyState
            icon={Sparkles}
            title="No services yet"
            description="Add a service, set its price, then publish it for students to buy."
            action={
              <Button size="sm" onClick={() => navigate(paths.admin.serviceNew)}>
                <Plus className="size-3.5" /> Add service
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
        title={publishTargetIsLive ? 'Move this service back to draft?' : 'Publish this service?'}
        description={
          publishTargetIsLive
            ? `${publishTarget?.name} will be hidden from students. Requests already paid for are unaffected.`
            : `${publishTarget?.name} will become available for students to buy.`
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
        title="Delete this service?"
        description={`${deleteTarget?.name} will be removed from the list and students can no longer buy it. Requests already paid for stay in the queue and must still be delivered.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={removeService.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          removeService.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
