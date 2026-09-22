import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';

export interface CourseOrderBadgeProps {
  /** `course.position`. Nothing renders when it is null. */
  position: number | null;
  /** `sm` for the 68px artwork chip on My Courses rows, where the tile size would crowd it. */
  size?: 'default' | 'sm';
  className?: string;
}

/**
 * "Course 1", "Course 2" — where a course sits in the order its category is
 * meant to be taken in. Pinned to the top-left of a course's artwork on every
 * tile that draws one, so the path reads the same on every screen.
 *
 * Navy at 80% with white text rather than a tinted `Badge`: it sits over
 * whatever artwork an admin uploads, and only a mostly-filled chip stays
 * legible on both a light and a dark picture. Decorative for a screen reader — each card
 * puts the same words in its own accessibility label.
 */
export function CourseOrderBadge({ position, size = 'default', className }: CourseOrderBadgeProps) {
  const { t } = useTranslation();

  if (position === null) return null;

  const small = size === 'sm';

  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={cn(
        // 80% so the artwork shows through a little (client request) while white
        // text on it stays readable over light pictures.
        'absolute bg-primary/80',
        // The small chip tucks into the corner; the tile badge floats inset.
        small ? 'left-0 top-0 rounded-br-md px-1.5 py-px' : 'left-2 top-2 rounded-md px-2 py-0.5',
        className,
      )}
    >
      <Text
        variant="none"
        numberOfLines={1}
        className={cn(
          'font-semibold text-primary-foreground',
          small ? 'text-[9px] leading-[15px]' : 'text-[10px] leading-4',
        )}
      >
        {t('courses.orderBadge', { number: position })}
      </Text>
    </View>
  );
}
