import { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, SearchX, SlidersHorizontal, WifiOff, X } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type { StudentCourseSummary } from '@shared/types/studentCourse';
import { colors, MIN_TOUCH_TARGET } from '@shared/theme/tokens';
import { CourseGridCard } from '@/components/shared/CourseGridCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchField } from '@/components/ui/SearchField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import type { HomeSearchState } from './useHomeSearch';

export interface CourseSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  search: HomeSearchState;
  onSelect: (course: StudentCourseSummary) => void;
  /** Open with the category panel already down — the filter button's entry. */
  openFiltersOnMount?: boolean;
}

/**
 * Home's search results, full screen.
 *
 * **Full screen rather than a dropdown under the field**, at the client's
 * choice and for a reason the codebase has already paid for once: Home's old
 * search dropdown had to render at screen root to survive Android refusing to
 * deliver touches to children drawn outside their parent's bounds. A `Modal`
 * has no parent to escape. It also means the keyboard never covers the results,
 * and a 2-up card grid gets the whole screen instead of the three rows a
 * dropdown could show.
 *
 * The cards are `CourseGridCard` with `showPurchase={false}` — the same tile
 * Home's Popular Courses strip uses, at the client's request, so a result looks
 * like the thing it will scroll back to. **Enrolled courses appear here**; the
 * card's lock badge is what separates them, and tapping either opens the course.
 *
 * The filter is a panel inside this sheet rather than a sheet of its own.
 * Stacking a second modal over a modal is its own set of Android bugs, and a
 * student picking categories wants to see the result count move as they tick.
 */
export function CourseSearchSheet({
  visible,
  onClose,
  search,
  onSelect,
  openFiltersOnMount = false,
}: CourseSearchSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [showFilters, setShowFilters] = useState(openFiltersOnMount);

  /*
   * Focus and panel state are re-seeded per OPENING, not per mount: the modal
   * stays mounted between opens, so doing this once on mount would autofocus
   * only the first time and would leave the panel however the last visit left
   * it. The keyboard is skipped when the filter button was the way in — that
   * student is reaching for categories, not the alphabet.
   */
  useEffect(() => {
    if (!visible) return;

    setShowFilters(openFiltersOnMount);

    if (openFiltersOnMount) return;

    // A frame's grace: focusing while the modal is still animating in is
    // dropped on Android.
    const timer = setTimeout(() => inputRef.current?.focus(), 120);

    return () => clearTimeout(timer);
  }, [visible, openFiltersOnMount]);

  const { results, selected, categories, isActive, isLoading, isSearching, isError } = search;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      // Android's hardware back button lands on `onRequestClose`; without this
      // it would close the whole screen behind the modal instead.
      statusBarTranslucent
    >
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="gap-2.5 px-4 pb-2.5 pt-2">
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={12}
              onPress={onClose}
              className="-ml-2 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
            >
              <ChevronLeft size={24} color={colors.foreground} />
            </Pressable>

            <View className="flex-1">
              <SearchField
                ref={inputRef}
                accessibilityLabel={t('search.label')}
                placeholder={t('search.placeholder')}
                value={search.query}
                onChangeText={search.setQuery}
                onClear={() => search.setQuery('')}
                returnKeyType="search"
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showFilters }}
              accessibilityLabel={
                selected.length > 0
                  ? t('search.filtersActive', { count: selected.length })
                  : t('search.filters')
              }
              onPress={() => setShowFilters((open) => !open)}
              style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET }}
              className={cn(
                'items-center justify-center rounded-full active:opacity-90',
                showFilters || selected.length > 0 ? 'bg-primary' : 'bg-muted',
              )}
            >
              <SlidersHorizontal
                size={18}
                color={
                  showFilters || selected.length > 0
                    ? colors['primary-foreground']
                    : colors.foreground
                }
              />

              {selected.length > 0 && (
                <View className="absolute -right-0.5 -top-0.5 h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1">
                  <Text className="text-[10px] font-bold leading-4 text-primary">
                    {selected.length}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {showFilters && (
            <CategoryFilter
              categories={categories}
              selected={selected}
              onToggle={search.toggleCategory}
              onClear={search.clearCategories}
            />
          )}

          {/*
            The count, only once there is something to count. It is the fastest
            way to tell "the filter did nothing" from "the filter did too much",
            which is exactly the question a student has after ticking a box.
          */}
          {isActive && !isLoading && !isError && (
            <Text variant="caption">
              {isSearching
                ? t('common.loading')
                : t('search.resultCount', { count: results.length })}
            </Text>
          )}
        </View>

        {isLoading ? (
          <View className="gap-2.5 px-4">
            {[0, 1].map((row) => (
              <View key={`search-skeleton-${row}`} className="flex-row gap-2.5">
                <Skeleton className="h-[190px] flex-1 rounded-xl" />
                <Skeleton className="h-[190px] flex-1 rounded-xl" />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={isActive ? results : []}
            keyExtractor={(course) => String(course.id)}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <View className="w-[47%] grow">
                <CourseGridCard
                  course={item}
                  onPress={() => onSelect(item)}
                  // The same tile Home's strip uses: a browsing surface, so a
                  // tap opens the course rather than starting a purchase.
                  showPurchase={false}
                />
              </View>
            )}
            contentContainerClassName="px-4 gap-2.5"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            // Without this, the first tap anywhere only dismisses the keyboard —
            // so tapping a card while typing does nothing at all.
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              isError ? (
                <EmptyState
                  icon={WifiOff}
                  tone="danger"
                  title={t('courses.loadFailedTitle')}
                  body={t('courses.loadFailedBody')}
                  actionLabel={t('common.retry')}
                  onAction={() => void search.refetch()}
                />
              ) : !isActive ? (
                // Nothing typed and nothing ticked. Not an error and not empty —
                // just the starting state, so it says what to do next.
                <EmptyState
                  icon={SearchX}
                  title={t('search.idleTitle')}
                  body={t('search.idleBody')}
                />
              ) : search.hasResultsOutsideFilter ? (
                // The categories emptied it, not the search term — so the way
                // out is clearing them, not retyping.
                <EmptyState
                  icon={SearchX}
                  title={t('search.filteredOutTitle')}
                  body={t('search.filteredOutBody')}
                  actionLabel={t('search.clearFilters')}
                  onAction={search.clearCategories}
                />
              ) : (
                <EmptyState
                  icon={SearchX}
                  title={t('search.noMatchesTitle')}
                  body={t('search.noMatchesBody')}
                />
              )
            }
          />
        )}
      </View>
    </Modal>
  );
}

interface CategoryFilterProps {
  categories: string[];
  selected: string[];
  onToggle: (name: string) => void;
  onClear: () => void;
}

/**
 * Multi-select category chips.
 *
 * Chips rather than a checkbox list: every option is one tap, the whole set is
 * visible at once, and ticked ones read as ticked from across the room. A list
 * of checkboxes would cost a scroll before the student had seen what is on
 * offer.
 *
 * It wraps rather than scrolling sideways. A horizontal strip hides options past
 * the edge, and a filter whose choices you cannot see is a filter nobody uses.
 */
function CategoryFilter({ categories, selected, onToggle, onClear }: CategoryFilterProps) {
  const { t } = useTranslation();

  if (categories.length === 0) return null;

  return (
    <View className="gap-2 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('search.categoriesTitle')}
        </Text>

        {selected.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('search.clearFilters')}
            hitSlop={10}
            onPress={onClear}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <X size={12} color={colors['muted-foreground']} />
            <Text className="text-[12px] text-muted-foreground">{t('search.clearFilters')}</Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {categories.map((category) => {
          const active = selected.includes(category);

          return (
            <Pressable
              key={category}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={category}
              onPress={() => onToggle(category)}
              hitSlop={4}
              className={cn(
                'min-h-[32px] justify-center rounded-full border px-3',
                active
                  ? 'border-primary bg-primary'
                  : 'border-border bg-background active:bg-muted',
              )}
            >
              <Text
                className={cn(
                  'text-[12px] font-medium',
                  active ? 'text-primary-foreground' : 'text-foreground',
                )}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
