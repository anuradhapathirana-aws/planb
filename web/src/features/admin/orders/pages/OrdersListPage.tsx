import { useMemo, useState } from 'react';
import { Landmark, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { FilterCard, FilterField } from '@/components/shared/FilterCard';
import { Pagination } from '@/components/shared/Pagination';
import { getOrderColumns } from '@/features/admin/orders/components/orderColumns';
import { OrderDetailSheet } from '@/features/admin/orders/components/OrderDetailSheet';
import { useOrders, useOrderStats } from '@/features/admin/orders/hooks/useOrders';
import { useAuthStore } from '@/stores/authStore';
import type { Order, OrderListFilters } from '@shared/types/order';

type StatusFilter = NonNullable<OrderListFilters['status']>;
type MethodFilter = NonNullable<OrderListFilters['method']>;

const DEFAULT_STATUS: StatusFilter = 'all';
const DEFAULT_METHOD: MethodFilter = 'all';

export function OrdersListPage() {
  /*
   * Mirrors OrderPolicy::review. This only hides the buttons — the backend is
   * what actually refuses the decision (root CLAUDE.md §7.12).
   */
  const canReview = useAuthStore((state) => state.hasRole('Super Admin', 'Accountant'));

  const [draftSearch, setDraftSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [draftMethod, setDraftMethod] = useState<MethodFilter>(DEFAULT_METHOD);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [appliedMethod, setAppliedMethod] = useState<MethodFilter>(DEFAULT_METHOD);

  const [sort, setSort] = useState<OrderListFilters['sort']>('created_at');
  const [direction, setDirection] = useState<OrderListFilters['direction']>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);

  const activeFilterCount = [
    appliedSearch.trim() !== '',
    appliedStatus !== DEFAULT_STATUS,
    appliedMethod !== DEFAULT_METHOD,
  ].filter(Boolean).length;

  const filters: OrderListFilters = useMemo(
    () => ({
      search: appliedSearch.trim() || undefined,
      status: appliedStatus,
      method: appliedMethod,
      sort,
      direction,
      page,
      per_page: 15,
    }),
    [appliedSearch, appliedStatus, appliedMethod, sort, direction, page],
  );

  const { data, isLoading, isFetching } = useOrders(filters);
  const { data: stats } = useOrderStats();

  const applyFilters = () => {
    setAppliedSearch(draftSearch);
    setAppliedStatus(draftStatus);
    setAppliedMethod(draftMethod);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftSearch('');
    setDraftStatus(DEFAULT_STATUS);
    setDraftMethod(DEFAULT_METHOD);
    setAppliedSearch('');
    setAppliedStatus(DEFAULT_STATUS);
    setAppliedMethod(DEFAULT_METHOD);
    setPage(1);
  };

  const handleSort = (columnId: string) => {
    if (sort === columnId) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(columnId as OrderListFilters['sort']);
      setDirection('desc');
    }
    setPage(1);
  };

  /** Jumps straight to what needs a human decision (FR-ADM-018). */
  const showVerificationQueue = () => {
    setDraftStatus('awaiting_verification');
    setAppliedStatus('awaiting_verification');
    setDraftMethod('bank_transfer');
    setAppliedMethod('bank_transfer');
    setPage(1);
  };

  const columns = useMemo(() => getOrderColumns({ onView: setSelected }), []);
  const pendingTransfers = stats?.pending_bank_transfers ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Orders &amp; payments</h1>
          <p className="text-sm text-muted-foreground">
            Course purchases, card payments and bank transfers awaiting verification.
          </p>
        </div>

        {pendingTransfers > 0 && (
          <Button size="sm" variant="outline" onClick={showVerificationQueue}>
            <Landmark className="size-3.5" />
            {pendingTransfers} transfer{pendingTransfers === 1 ? '' : 's'} to verify
          </Button>
        )}
      </div>

      <FilterCard activeCount={activeFilterCount} onApply={applyFilters} onClear={clearFilters}>
        <FilterField label="Search" className="sm:min-w-64">
          <Input
            placeholder="Order number, course or student…"
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
              <SelectItem value="pending">Awaiting payment</SelectItem>
              <SelectItem value="awaiting_verification">Awaiting verification</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Method">
          <Select value={draftMethod} onValueChange={(v) => setDraftMethod(v as MethodFilter)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="bank_transfer">Bank transfer</SelectItem>
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
            icon={Receipt}
            title="No orders yet"
            description="Orders appear here as soon as a student enrols in a paid course."
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

      <OrderDetailSheet order={selected} onOpenChange={(open) => !open && setSelected(null)} canReview={canReview} />
    </div>
  );
}
