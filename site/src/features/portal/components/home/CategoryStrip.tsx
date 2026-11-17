import { Link } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { EDGE_STRIP } from '@/features/portal/components/home/homeLayout';
import { courseCategoryGlyph } from '@/features/marketing/courseCategoryIcons';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import type { StudentCourseCategory } from '@shared/types/studentCourse';

/**
 * Three tiles and half of the next on screen — the half is the only cue that
 * the row scrolls. `(100% − 3 gaps) / 3.5`, with the gutter already removed.
 */
const TILE_WIDTH = 'basis-[calc((100%-30px)/3.5)]';

/** The four pastel tints, cycled in order, as the app does. Literal classes so Tailwind sees them. */
const TINTS = [
  { card: 'bg-category-1 border-category-1-foreground/15', glyph: 'text-category-1-foreground', disc: 'bg-category-1' },
  { card: 'bg-category-2 border-category-2-foreground/15', glyph: 'text-category-2-foreground', disc: 'bg-category-2' },
  { card: 'bg-category-3 border-category-3-foreground/15', glyph: 'text-category-3-foreground', disc: 'bg-category-3' },
  { card: 'bg-category-4 border-category-4-foreground/15', glyph: 'text-category-4-foreground', disc: 'bg-category-4' },
] as const;

/**
 * "Top Categories" — every active category as a tinted tile with its icon in a
 * white-ringed disc that rises out of the tile's top edge, after the app's
 * `CategoryStrip` / `CategoryCard`. Each opens the portal's All Courses filtered
 * to that category, where a bundle-sold category is headed by its bundle.
 */
export function CategoryStrip({ categories }: { categories: StudentCourseCategory[] }) {
  return (
    <ul className={cn(EDGE_STRIP, 'gap-2.5')}>
      {categories.map((category, index) => {
        const tint = TINTS[index % TINTS.length]!;
        const Icon = courseCategoryGlyph(category.icon);

        return (
          <li key={category.id} className={cn('shrink-0 snap-start', TILE_WIDTH)}>
            <Link
              to={paths.app.browse(category.id)}
              className="relative flex h-full flex-col items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-80"
            >
              {/* The tile, starting 18px down so the disc overhangs its top edge. */}
              <span aria-hidden="true" className={cn('absolute inset-x-0 top-[18px] bottom-0 rounded-2xl border', tint.card)} />

              <span
                aria-hidden="true"
                className={cn('relative flex size-11 items-center justify-center rounded-full border-2 border-card', tint.disc)}
              >
                {category.icon_image_url ? (
                  <img src={category.icon_image_url} alt="" className="size-[22px] object-contain" />
                ) : (
                  <Icon className={cn('size-[22px]', tint.glyph)} />
                )}
              </span>

              <span className="relative mt-1.5 mb-3 line-clamp-2 min-h-8 px-2 text-center text-[12px] font-medium leading-4 text-foreground">
                {category.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Three tiles and a half at the tiles' own height, so the page does not jump when they land. */
export function CategoryStripSkeleton() {
  return (
    <div className="flex h-[94px] gap-2.5">
      {[0, 1, 2].map((slot) => (
        <Skeleton key={slot} className="h-full flex-1 rounded-2xl" />
      ))}
      <Skeleton className="h-full flex-[0.5] rounded-2xl" />
    </div>
  );
}
