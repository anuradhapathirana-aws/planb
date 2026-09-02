import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { FilterCard, FilterField } from '@/components/shared/FilterCard';
import { Pagination } from '@/components/shared/Pagination';
import { ServicePurchaseDetailSheet } from '@/features/admin/services/components/ServicePurchaseDetailSheet';
import { getServicePurchaseColumns } from '@/features/admin/services/components/servicePurchaseColumns';
import { useServicePurchases } from '@/features/admin/services/hooks/useServicePurchases';
import { useServices } from '@/features/admin/services/hooks/useServices';
import { useAuthStore } from '@/stores/authStore';
import type { ServicePurchase, ServicePurchaseListFilters } from '@shared/types/service';

type StatusFilter = NonNullable<ServicePurchaseListFilters['status']>;
type ServiceFilter = NonNullable<ServicePurchaseListFilters['service_id']>;

const DEFAULT_STATUS: StatusFilter = 'all';
const DEFAULT_SERVICE: ServiceFilter = 'all';

export function ServicePurchasesListPage() {
  // The Services list links here with ?service=<id>, so arriving from a service
  // row lands on that service's queue already filtered.
  const [searchParams] = useSearchParams();
  const initialService: ServiceFilter = searchParams.get('service')
    ? Number(searchParams.get('service'))
    : DEFAULT_SERVICE;

  const canHandle = useAuthStore((state) => state.hasRole('Super Admin', 'Support Agent'));

  const [draftSearch, setDraftSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [draftService, setDraftService] = useState<ServiceFilter>(initialService);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [appliedService, setAppliedService] = useState<ServiceFilter>(initialService);

  const [sort, setSort] = useState<ServicePurchaseListFilters['sort']>('purchased_at');
  const [direction, setDirection] = useState<ServicePurchaseListFilters['direction']>('desc');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<ServicePurchase | null>(null);

  const activeFilterCount = [
    appliedSearch.trim() !== '',
    appliedStatus !== DEFAULT_STATUS,
    appliedService !== DEFAULT_SERVICE,
  ].filter(Boolean).length;

  const filters: ServicePurchaseListFilters = useMemo(
    () => ({
      search: appliedSearch.trim() || undefined,
      status: appliedStatus,
      service_id: appliedService,
      sort,
      direction,
      page,
      per_page: 15,
    }),
    [appliedSearch, appliedStatus, appliedService, sort, direction, page],
  );

  const { data, isLoading, isFetching } = useServicePurchases(filters);
  const { data: serviceOptions } = useServices({ status: 'all', sort: 'name', direction: 'asc', per_page: 100 });

  const applyFilters = () => {
    setAppliedSearch(draftSearch);
    setAppliedStatus(draftStatus);
    setAppliedService(draftService);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftSearch('');
    setDraftStatus(DEFAULT_STATUS);
    setDraftService(DEFAULT_SERVICE);
    setAppliedSearch('');
    setAppliedStatus(DEFAULT_STATUS);
    setAppliedService(DEFAULT_SERVICE);
    setPage(1);
  };

  const handleSort = (columnId: string) => {
    if (sort === columnId) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(columnId as ServicePurchaseListFilters['sort']);
      setDirection('desc');
    }
    setPage(1);
  };

  const columns = useMemo(() => getServicePurchaseColumns({ onView: setSelected }), []);

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Service purchases</h1>
          <p className="text-sm text-muted-foreground">
            Every service a student has paid for, and how far delivery has got.
          </p>
        </div>
      </div>

      <FilterCard activeCount={activeFilterCount} onApply={applyFilters} onClear={clearFilters}>
        <FilterField label="Search" className="sm:min-w-64">
          <Input
            placeholder="Student, order number or service…"
            className="h-8 text-sm"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </FilterField>

        <FilterField label="Service">
          <Select value={String(draftService)} onValueChange={(v) => setDraftService(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {serviceOptions?.data.map((service) => (
                <SelectItem key={service.id} value={String(service.id)}>
                  {service.name}
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
              <SelectItem value="pending">Waiting to start</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
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
        onRowClick={setSelected}
        emptyState={
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing to deliver"
            description="Services students pay for will appear here for someone to work through."
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

      <ServicePurchaseDetailSheet
        purchase={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        canHandle={canHandle}
      />
    </div>
  );
}
