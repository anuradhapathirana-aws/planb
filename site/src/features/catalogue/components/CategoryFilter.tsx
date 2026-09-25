import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';
import { courseCategoryGlyph } from '@/features/marketing/courseCategoryIcons';
import { cn } from '@/lib/utils';
import type { PublicCourseCategory } from '@shared/types/publicCourse';

/**
 * Category chips: top-level categories on one row, and — once a category with
 * sub-categories is chosen — its sub-categories on a second.
 *
 * Chips rather than a dropdown: there are a handful of categories, and seeing
 * them all is itself useful to a visitor working out what Plan B teaches. The
 * row scrolls sideways on a phone instead of wrapping into a wall of pills.
 *
 * Icons come from the fixed registry (`courseCategoryGlyph`), never from a name
 * built out of the stored value (`SEC-5`).
 */
export function CategoryFilter({
  categories,
  selectedId,
  onSelect,
}: {
  categories: PublicCourseCategory[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const { t } = useTranslation();

  const activeParent = categories.find(
    (parent) => parent.id === selectedId || parent.children?.some((child) => child.id === selectedId),
  );
  const children = activeParent?.children ?? [];

  return (
    <div className="space-y-2">
      <ChipRow label={t('site.catalogue.categoriesLabel')}>
        <Chip active={selectedId === null} onClick={() => onSelect(null)}>
          {t('site.catalogue.allCategories')}
        </Chip>

        {categories.map((category) => {
          const Icon = courseCategoryGlyph(category.icon);

          return (
            <Chip
              key={category.id}
              active={activeParent?.id === category.id}
              onClick={() => onSelect(category.id)}
              count={category.courses_count}
            >
              <Icon className="size-4" aria-hidden="true" />
              {category.name}
            </Chip>
          );
        })}
      </ChipRow>

      {activeParent && children.length > 0 ? (
        <ChipRow label={activeParent.name ?? ''} subtle>
          <Chip subtle active={selectedId === activeParent.id} onClick={() => onSelect(activeParent.id)}>
            {t('site.catalogue.allInCategory', { name: activeParent.name })}
          </Chip>

          {children.map((child) => (
            <Chip
              key={child.id}
              subtle
              active={selectedId === child.id}
              onClick={() => onSelect(child.id)}
              count={child.courses_count}
            >
              {child.name}
            </Chip>
          ))}
        </ChipRow>
      ) : null}
    </div>
  );
}

export function CategoryFilterSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {[112, 128, 96, 140, 104].map((width) => (
        <Skeleton key={width} className="h-10 shrink-0 rounded-full" style={{ width }} />
      ))}
    </div>
  );
}

function ChipRow({ label, subtle, children }: { label: string; subtle?: boolean; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        // Bleeds to the screen edge on a phone so a chip cut by the edge signals "scroll".
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0',
        subtle && 'pl-4 sm:pl-0',
      )}
    >
      {children}
    </div>
  );
}

function Chip({
  active,
  subtle,
  count,
  onClick,
  children,
}: {
  active: boolean;
  subtle?: boolean;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        subtle ? 'h-9 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary-soft',
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            'rounded-full px-1.5 text-[11px] tabular-nums',
            active ? 'bg-white/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
