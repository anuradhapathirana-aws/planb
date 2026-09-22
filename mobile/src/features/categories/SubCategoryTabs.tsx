import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { StudentCategoryDetail } from '@shared/types/studentCourse';
import { CategoryChip } from '@/features/categories/CategoryChip';

export interface SubCategoryTabsProps {
  category: Pick<StudentCategoryDetail, 'icon' | 'children'>;
  /** The picked sub-category; null is "All". */
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

/** Space left before a picked tab, so the one to its left still peeks in. */
const PEEK = 24;

/**
 * "All" plus one tab per sub-category, as a horizontal slider pinned under a
 * main category's header. A row that wrapped pushed the courses down the page
 * and scrolled away with them; this one stays put and costs one line.
 *
 * Picking a tab slides it into view, so a tab half off the edge never stays
 * that way — the student always sees what they picked.
 */
export function SubCategoryTabs({ category, selectedId, onSelect }: SubCategoryTabsProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  // Each tab's left edge, measured as it lays out; keyed by id, "all" for All.
  const offsets = useRef(new Map<number | 'all', number>());

  useEffect(() => {
    const x = offsets.current.get(selectedId ?? 'all');
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - PEEK), animated: true });
  }, [selectedId]);

  const track = (key: number | 'all') => (x: number) => offsets.current.set(key, x);

  return (
    <View className="border-b border-border bg-background">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        accessibilityRole="radiogroup"
        contentContainerClassName="gap-2 px-4 py-2"
      >
        <Tab onLayoutX={track('all')}>
          <CategoryChip
            label={t('home.categoryAll')}
            selected={selectedId === null}
            onPress={() => onSelect(null)}
          />
        </Tab>
        {category.children.map((child) => (
          <Tab key={child.id} onLayoutX={track(child.id)}>
            <CategoryChip
              label={child.name}
              // A sub-category with no icon of its own borrows its main category's.
              category={child.icon || child.icon_image_url ? child : { ...child, icon: category.icon }}
              selected={selectedId === child.id}
              onPress={() => onSelect(child.id)}
            />
          </Tab>
        ))}
      </ScrollView>
    </View>
  );
}

function Tab({ onLayoutX, children }: { onLayoutX: (x: number) => void; children: ReactNode }) {
  return <View onLayout={(event) => onLayoutX(event.nativeEvent.layout.x)}>{children}</View>;
}
