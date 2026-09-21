import { COURSE_CATEGORY_ICON_GLYPHS } from '@/features/admin/courseCategories/courseCategoryIcons';
import { cn } from '@/lib/utils';
import type { CourseCategory } from '@shared/types/course';

interface CourseCategoryIconTileProps {
  category: Pick<CourseCategory, 'icon' | 'icon_image_url' | 'name'>;
  size?: 'sm' | 'md';
}

/**
 * What a category's tile shows on the student app: the uploaded image when a
 * sub-category has one, else the picked glyph. A category with neither shows a
 * dashed slot rather than nothing, which would misalign the names beside it.
 */
export function CourseCategoryIconTile({ category, size = 'md' }: CourseCategoryIconTileProps) {
  const Glyph = category.icon ? COURSE_CATEGORY_ICON_GLYPHS[category.icon] : null;
  const box = size === 'sm' ? 'size-6' : 'size-7';

  if (category.icon_image_url) {
    return (
      <img
        src={category.icon_image_url}
        alt=""
        className={cn(box, 'shrink-0 rounded-md border border-border bg-background object-contain p-0.5')}
      />
    );
  }

  if (Glyph) {
    return (
      <span className={cn(box, 'flex shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary')}>
        <Glyph className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn(box, 'shrink-0 rounded-md border border-dashed border-border')}
      title="No icon — the app picks one from the name"
    />
  );
}
