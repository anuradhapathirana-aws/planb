import type { LucideIcon } from 'lucide-react';

import { courseCategoryGlyph } from '@/features/marketing/courseCategoryIcons';
import { cn } from '@/lib/utils';
import type { StudentCourseCategory } from '@shared/types/studentCourse';

/*
 * The category chip — the app's `CategoryChip`. Used by the Browse filter panel
 * and the Category page's sub-category tabs, so the two look and behave alike.
 * Icons come from the fixed registry (`courseCategoryGlyph`), never from a name
 * built out of stored data.
 */

interface CategoryChipProps {
  label: string;
  /** An uploaded icon wins over the glyph. */
  iconUrl?: string | null;
  glyph?: LucideIcon | null;
  selected: boolean;
  onSelect: () => void;
}

/** The chip's icon: an uploaded image when the category has one, else its registry glyph. */
export function chipIcon(category: Pick<StudentCourseCategory, 'icon' | 'icon_image_url'>) {
  return {
    iconUrl: category.icon_image_url,
    glyph: category.icon_image_url ? null : courseCategoryGlyph(category.icon),
  };
}

export function CategoryChip({ label, iconUrl, glyph: Glyph, selected, onSelect }: CategoryChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-foreground active:bg-muted',
      )}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" className="size-4 rounded-[3px] object-contain" />
      ) : Glyph ? (
        <Glyph className={cn('size-3.5', selected ? 'text-primary-foreground' : 'text-primary')} aria-hidden="true" />
      ) : null}
      <span className="truncate">{label}</span>
    </button>
  );
}
