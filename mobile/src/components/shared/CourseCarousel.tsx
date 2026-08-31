import { useCallback, useState } from 'react';
import {
  FlatList,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { CourseCard } from '@/components/shared/CourseCard';
import { cn } from '@/lib/cn';

/** The screen gutter `Screen` applies. The carousel breaks out of it and re-adds it. */
const GUTTER = 20;
const GAP = 12;
/** How much of the next card stays visible, which is what says "this scrolls". */
const PEEK = 32;

export interface CourseCarouselProps {
  courses: StudentCourseSummary[];
  onSelect: (course: StudentCourseSummary) => void;
}

/**
 * The student's enrolled courses, side by side.
 *
 * A carousel rather than a stacked list because these are the few things that
 * are already theirs: they should all be reachable without scrolling the page,
 * leaving the vertical space on Home for what to do next. Cards snap, and the
 * next one peeks past the edge so the gesture is discoverable without a hint.
 */
export function CourseCarousel({ courses, onSelect }: CourseCarouselProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const cardWidth = Math.min(width - GUTTER * 2 - PEEK, 360);
  const interval = cardWidth + GAP;

  const onMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.x;

      setIndex(Math.max(0, Math.round(offset / interval)));
    },
    [interval],
  );

  return (
    <View>
      <FlatList
        // Breaks out of the page gutter so cards can scroll edge to edge, then
        // re-adds it as padding so the first card still lines up with the text
        // above it.
        className="-mx-5"
        data={courses}
        keyExtractor={(course) => String(course.id)}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <CourseCard course={item} onPress={() => onSelect(item)} />
          </View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: GAP }}
        snapToInterval={interval}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
      />

      {/* Position indicator. Decorative — a screen reader walks the cards
          themselves, and a row of dots read aloud would be noise. */}
      {courses.length > 1 && (
        <View
          className="mt-3 flex-row items-center justify-center gap-1.5"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {courses.map((course, dot) => (
            <View
              key={course.id}
              className={cn(
                'h-1.5 rounded-full',
                dot === index ? 'w-5 bg-primary' : 'w-1.5 bg-border',
              )}
            />
          ))}
        </View>
      )}
    </View>
  );
}
