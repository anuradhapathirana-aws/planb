import { useMemo, useState } from 'react';
import { IdCard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FilterCard, FilterField } from '@/components/shared/FilterCard';
import { useProfessions, useToggleProfessionActive } from '@/features/admin/professions/hooks/useProfessions';
import { getProfessionColumns } from '@/features/admin/professions/components/professionColumns';
import { ProfessionFormDialog } from '@/features/admin/professions/components/ProfessionFormDialog';
import { useIndustries } from '@/features/admin/industries/hooks/useIndustries';
import type { Profession, ProfessionListFilters } from '@shared/types/profession';

type StatusFilter = NonNullable<ProfessionListFilters['is_active']>;
type IndustryFilter = NonNullable<ProfessionListFilters['industry_id']>;

const DEFAULT_STATUS: StatusFilter = 'all';
const DEFAULT_INDUSTRY: IndustryFilter = 'all';

export function ProfessionsListPage() {
  const [draftSearch, setDraftSearch] = useState('');
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [draftIndustry, setDraftIndustry] = useState<IndustryFilter>(DEFAULT_INDUSTRY);

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [appliedIndustry, setAppliedIndustry] = useState<IndustryFilter>(DEFAULT_INDUSTRY);

  const [sort, setSort] = useState<ProfessionListFilters['sort']>('name');
  const [direction, setDirection] = useState<ProfessionListFilters['direction']>('asc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProfession, setEditingProfession] = useState<Profession | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Profession | null>(null);

  const activeFilterCount = [
    appliedSearch.trim() !== '',
    appliedStatus !== DEFAULT_STATUS,
    appliedIndustry !== DEFAULT_INDUSTRY,
  ].filter(Boolean).length;

  const filters: ProfessionListFilters = useMemo(
    () => ({
      search: appliedSearch.trim() || undefined,
      is_active: appliedStatus,
      industry_id: appliedIndustry,
      sort,
      direction,
      page,
      per_page: 15,
    }),
    [appliedSearch, appliedStatus, appliedIndustry, sort, direction, page],
  );

  const { data, isLoading, isFetching } = useProfessions(filters);
  const { data: industryOptions } = useIndustries({ is_active: 'all', sort: 'name', direction: 'asc', per_page: 100 });
  const toggleActive = useToggleProfessionActive();

  const applyFilters = () => {
    setAppliedSearch(draftSearch);
    setAppliedStatus(draftStatus);
    setAppliedIndustry(draftIndustry);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftSearch('');
    setDraftStatus(DEFAULT_STATUS);
    setDraftIndustry(DEFAULT_INDUSTRY);
    setAppliedSearch('');
    setAppliedStatus(DEFAULT_STATUS);
    setAppliedIndustry(DEFAULT_INDUSTRY);
    setPage(1);
  };

  const handleSort = (columnId: string) => {
    if (sort === columnId) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(columnId as ProfessionListFilters['sort']);
      setDirection('asc');
    }
    setPage(1);
  };

  const columns = useMemo(
    () =>
      getProfessionColumns({
        onEdit: (profession) => {
          setEditingProfession(profession);
          setFormOpen(true);
        },
        onToggleActive: (profession) => setToggleTarget(profession),
      }),
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Professions</h1>
          <p className="text-sm text-muted-foreground">Manage the profession list students choose from, grouped by industry.</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingProfession(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-3.5" /> Add profession
        </Button>
      </div>

      <FilterCard activeCount={activeFilterCount} onApply={applyFilters} onClear={clearFilters}>
        <FilterField label="Search" className="sm:min-w-64">
          <Input
            placeholder="Profession name…"
            className="h-8 text-sm"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </FilterField>

        <FilterField label="Industry">
          <Select value={String(draftIndustry)} onValueChange={(v) => setDraftIndustry(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="All industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {industryOptions?.data.map((industry) => (
                <SelectItem key={industry.id} value={String(industry.id)}>
                  {industry.name}
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
            icon={IdCard}
            title="No professions found"
            description="Try adjusting your search or filters, or add a new profession."
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="size-3.5" /> Add profession
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

      <ProfessionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        profession={editingProfession}
        defaultIndustryId={appliedIndustry !== 'all' ? appliedIndustry : null}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.is_active ? 'Deactivate this profession?' : 'Activate this profession?'}
        description={
          toggleTarget?.is_active
            ? `${toggleTarget?.name} will no longer appear when adding or editing students. Existing students keep their data.`
            : `${toggleTarget?.name} will be selectable again on the Student form.`
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
