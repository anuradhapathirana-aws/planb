import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SearchX, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { CourseResultRow } from '@/components/shared/CourseResultRow';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { COURSE_SEARCH_TABS, type CourseSearchState } from './useCourseSearch';

export interface CourseSearchResultsProps extends CourseSearchState {
  onSelect: (course: StudentCourseSummary) => void;
  onEnrol: (course: StudentCourseSummary) => void;
  enrollingCourseId: number | null;
  /** Distance from the top of the screen to just under the search field. */
  anchorTop: number;
  onDismiss: () => void;
}

/**
 * The dropdown under the Home search field.
 *
 * Rendered by the screen at ROOT level rather than as a child of the field, and
 * that is not a style choice: Android does not deliver touches to a child drawn
 * outside its parent's bounds, so a scrim nested inside the 48px-tall field
 * would be invisible to every tap. Anchoring it here — with the field's measured
 * bottom edge passed in — is what makes "tap outside to close" work on both
 * platforms.
 */
export function CourseSearchResults({
  tab,
  setTab,
  results,
  counts,
  isSearching,
  isError,
  hasQuery,
  onSelect,
  onEnrol,
  enrollingCourseId,
  anchorTop,
  onDismiss,
}: CourseSearchResultsProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();

  return (
    // `box-none` so the panel's own children stay tappable while the empty
    // space around it falls through to the scrim underneath.
    <View className="absolute inset-0" style={{ top: anchorTop }} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        className="absolute inset-0 bg-black/20"
        onPress={onDismiss}
      />

      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(140)}
        exiting={reduceMotion ? undefined : FadeOut.duration(100)}
        className="mx-5 mt-1.5 overflow-hidden rounded-xl border border-border bg-card"
        // Android paints by elevation, not document order, so without this the
        // ScrollView behind would draw over the panel.
        style={{ elevation: 8 }}
      >
        <View className="flex-row border-b border-border">
          {COURSE_SEARCH_TABS.map((candidate) => {
            const selected = candidate === tab;

            return (
              <Pressable
                key={candidate}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${t(`search.tab.${candidate}`)}, ${counts[candidate]}`}
                onPress={() => setTab(candidate)}
                className={cn(
                  'min-h-[44px] flex-1 flex-row items-center justify-center gap-1.5 px-2',
                  // The underline carries the selection, not a filled pill —
                  // three filled pills in a row would compete with the results.
                  selected && 'border-b-2 border-primary',
                )}
              >
                <Text
                  className={cn(
                    'text-[12px] font-semibold leading-4',
                    selected ? 'text-primary' : 'text-muted-foreground',
                  )}
                  numberOfLines={1}
                >
                  {t(`search.tab.${candidate}`)}
                </Text>

                <View
                  className={cn(
                    'min-w-[18px] items-center rounded-full px-1 py-0.5',
                    selected ? 'bg-primary' : 'bg-muted',
                  )}
                >
                  <Text
                    className={cn(
                      'text-[10px] font-bold leading-3',
                      selected ? 'text-primary-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {counts[candidate]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {isSearching && results.length === 0 ? (
          <View className="items-center gap-2 px-5 py-8">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="caption">{t('common.loading')}</Text>
          </View>
        ) : isError ? (
          <Message
            icon={WifiOff}
            title={t('courses.loadFailedTitle')}
            body={t('courses.loadFailedBody')}
          />
        ) : results.length === 0 ? (
          <Message
            icon={SearchX}
            title={hasQuery ? t('search.noMatchesTitle') : t('search.emptyTabTitle')}
            body={hasQuery ? t('search.noMatchesBody') : t('search.emptyTabBody')}
          />
        ) : (
          <ScrollView
            // Capped so the dropdown can never swallow the screen; the list
            // scrolls inside it instead.
            style={{ maxHeight: 320 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="p-1.5 gap-1"
          >
            {results.map((course) => (
              <CourseResultRow
                key={course.id}
                course={course}
                onPress={() => onSelect(course)}
                onEnrol={course.is_enrolled ? undefined : () => onEnrol(course)}
                enrolling={enrollingCourseId === course.id}
              />
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function Message({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof SearchX;
  title: string;
  body: string;
}) {
  return (
    <View className="items-center px-6 py-8">
      <Icon size={22} color={colors['muted-foreground']} />
      <Text className="mt-2 text-center text-[14px] font-medium leading-5 text-foreground">
        {title}
      </Text>
      <Text variant="caption" className="mt-1 text-center">
        {body}
      </Text>
    </View>
  );
}
