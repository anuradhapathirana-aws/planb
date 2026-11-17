import { useTranslation } from 'react-i18next';
import { FolderOpen, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CategoryChip, chipIcon } from '@/features/portal/components/browse/CategoryChip';
import type { CategoryFilterState } from '@/features/portal/hooks/useCategoryFilter';

/**
 * The category picker under the Browse search bar — the app's
 * `CategoryFilterPanel`: main categories as chips, then that category's
 * sub-categories once one with any is picked, then Apply. Nothing changes the
 * list until Apply; "Clear" resets and closes.
 */
export function CategoryFilterPanel({ filter, onDone }: { filter: CategoryFilterState; onDone: () => void }) {
  const { t } = useTranslation();
  const { tree, draft, draftParent } = filter;
  const children = draftParent?.children ?? [];
  const hasSomethingToClear = filter.appliedId !== null || draft.parentId !== null;

  if (tree.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('search.categoriesTitle')}</SectionLabel>
          {hasSomethingToClear ? (
            <button
              type="button"
              onClick={() => {
                filter.clear();
                onDone();
              }}
              className="-my-2 flex min-h-9 items-center gap-1 px-1 text-[12px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
            >
              <X className="size-3" aria-hidden="true" />
              {t('search.clearFilters')}
            </button>
          ) : null}
        </div>

        <div role="radiogroup" aria-label={t('search.categoriesTitle')} className="flex flex-wrap gap-2">
          <CategoryChip label={t('home.categoryAll')} selected={draft.parentId === null} onSelect={() => filter.selectParent(null)} />
          {tree.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.name}
              {...chipIcon(category)}
              selected={draft.parentId === category.id}
              onSelect={() => filter.selectParent(category.id)}
            />
          ))}
        </div>
      </div>

      {draftParent && children.length > 0 ? (
        <div className="space-y-2 border-t pt-3">
          <SectionLabel>{t('search.subCategoriesTitle')}</SectionLabel>
          <div role="radiogroup" aria-label={t('search.subCategoriesTitle')} className="flex flex-wrap gap-2">
            <CategoryChip
              label={t('search.allInCategory', { name: draftParent.name })}
              selected={draft.subId === null}
              onSelect={() => filter.selectSub(null)}
            />
            {children.map((child) => (
              <CategoryChip
                key={child.id}
                label={child.name}
                // A sub-category with no icon of its own borrows its parent's.
                {...chipIcon(child.icon || child.icon_image_url ? child : { ...child, icon: draftParent.icon })}
                selected={draft.subId === child.id}
                onSelect={() => filter.selectSub(child.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <Button
        size="sm"
        className="w-full"
        disabled={!filter.isDirty}
        onClick={() => {
          filter.apply();
          onDone();
        }}
      >
        {t('search.applyFilters')}
      </Button>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{children}</p>;
}

/** What is applied, with an ✕ to lift it — shown while the panel is closed. */
export function AppliedCategoryChip({ label, onClear }: { label: string; onClear: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex">
      <span className="flex min-h-8 items-center gap-1.5 rounded-full bg-primary-soft pr-1 pl-3 text-[12px] font-medium text-primary">
        <FolderOpen className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
        <button
          type="button"
          onClick={onClear}
          aria-label={t('search.clearFilters')}
          className="flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-border"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}
