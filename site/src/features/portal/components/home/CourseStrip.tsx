import { Skeleton } from '@/components/ui/skeleton';
import { CourseTile } from '@/features/portal/components/home/CourseTile';
import { EDGE_STRIP } from '@/features/portal/components/home/homeLayout';
import { cn } from '@/lib/utils';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

/**
 * Two tiles and a 20px sliver of the third — the app's `ExploreStrip`. Solved
 * against the strip's content box (screen minus both gutters):
 * `(100% + gutter − gap·2 − peek) / 2`, i.e. `(100% − 24px) / 2` on a phone.
 */
const TILE_WIDTH = 'basis-[calc((100%-24px)/2)]';

interface CourseStripProps {
  courses: StudentCourseSummary[];
  onToggleWishlist: (course: StudentCourseSummary) => void;
}

/** Home's "Popular Courses" row, scrolled sideways and snapping to a tile edge. */
export function CourseStrip({ courses, onToggleWishlist }: CourseStripProps) {
  return (
    <ul className={cn(EDGE_STRIP, 'gap-2.5')}>
      {courses.map((course) => (
        <li key={course.id} className={cn('flex shrink-0 snap-start', TILE_WIDTH)}>
          <CourseTile course={course} onToggleWishlist={onToggleWishlist} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

export function CourseStripSkeleton() {
  return (
    <div className="flex gap-2.5">
      <Skeleton className="h-[190px] flex-1 rounded-xl" />
      <Skeleton className="h-[190px] flex-1 rounded-xl" />
    </div>
  );
}
