import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';

import type { StudentCategoryDetail, StudentCourseSummary } from '@shared/types/studentCourse';
import { colors } from '@shared/theme/tokens';
import { formatCourseLength, formatMoney } from '@shared/lib/formatters';
import { fetchCategory } from '@/api/courses.api';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Package,
  Play,
  ShieldCheck,
  WifiOff,
} from '@/components/icons';
import { CourseGridCard } from '@/components/shared/CourseGridCard';
import { Button } from '@/components/ui/Button';
import { CircleButton } from '@/components/ui/CircleButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { CourseOrderHint } from '@/features/categories/CourseOrderHint';
import { SubCategoryTabs } from '@/features/categories/SubCategoryTabs';
import { useBundlePurchase } from '@/features/categories/useBundlePurchase';
import { usePaymentsEnabled } from '@/features/enrolment/usePaymentsEnabled';
import { categoryIcon } from '@/features/home/categoryIcons';
import { cn } from '@/lib/cn';

type Bundle = NonNullable<StudentCategoryDetail['bundle']>;

/**
 * One category: its courses, grouped by sub-category — and, when they are sold
 * as a bundle (this category's own, or its main category's when it follows
 * that one), the one button that buys every course the student does not own
 * yet. A sub-category that is a bundle of its own gets a link to its page.
 *
 * A bundle is always bought from HERE, with the list of what it contains in
 * front of the student: a course page in a bundle category and the All Courses
 * banner both lead to this screen rather than straight to checkout. Payment is
 * the same `/checkout/[orderId]` a single course uses.
 *
 * Every figure — what is left, what it costs — is the server's. Courses the
 * student already owns are never charged again.
 */
export default function CategoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => fetchCategory(categoryId),
    enabled: Number.isFinite(categoryId),
  });

  const paymentsEnabled = usePaymentsEnabled();
  const { buy, isBuying } = useBundlePurchase();

  // Which sub-category chip is picked; null shows every course, grouped.
  const [subId, setSubId] = useState<number | null>(null);
  const listRef = useRef<ScrollView>(null);
  // A new tab starts its courses from the top, not wherever the last one was scrolled.
  const pickSub = useCallback((next: number | null) => {
    setSubId(next);
    listRef.current?.scrollTo({ y: 0, animated: true });
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  // The pinned footer's measured height — it grows when the note sits in it.
  const [footerHeight, setFooterHeight] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const sections = useMemo(() => (data ? groupCourses(data, subId) : []), [data, subId]);

  // The first course still worth opening, for "Continue learning".
  const nextCourse = useMemo(
    () =>
      data?.courses.find((course) => course.is_enrolled && !course.progress.completed_at) ??
      data?.courses.find((course) => course.is_enrolled) ??
      null,
    [data],
  );

  const openCourse = (course: StudentCourseSummary) =>
    router.push({ pathname: '/course/[id]', params: { id: course.id } });

  const bundle = data?.bundle ?? null;
  const showBar = bundle !== null;
  /*
   * A sub-category's page is set one type step smaller throughout — it is a
   * drill-down under its main category, and reads as one. Every size moves
   * together, so the hierarchy between them is unchanged.
   */
  const compact = data?.parent != null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 pb-2" style={{ paddingTop: insets.top + 4 }}>
        <CircleButton icon={ChevronLeft} label={t('common.back')} onPress={() => router.back()} />
        <Text
          variant={compact ? 'none' : 'heading'}
          numberOfLines={1}
          className={cn('flex-1 text-center', compact && 'text-[15px] font-semibold leading-6 text-primary')}
        >
          {t('bundle.title')}
        </Text>
        {/* Balances the back button so the title stays centred. */}
        <View className="h-11 w-11" />
      </View>

      {isLoading && (
        <View className="gap-3 px-4 pt-2">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full" />
          <View className="flex-row gap-2.5">
            <Skeleton className="h-[170px] flex-1 rounded-xl" />
            <Skeleton className="h-[170px] flex-1 rounded-xl" />
          </View>
        </View>
      )}

      {isError && (
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title={t('bundle.loadFailedTitle')}
          body={t('courses.loadFailedBody')}
          actionLabel={t('common.retry')}
          onAction={() => void refetch()}
        />
      )}

      {data && (
        <>
          {data.children.length > 0 && (
            <SubCategoryTabs category={data} selectedId={subId} onSelect={pickSub} />
          )}

          <ScrollView
            ref={listRef}
            contentContainerClassName="px-4 pt-1 gap-4"
            // Clears the pinned bar, which would otherwise cover the last row.
            contentContainerStyle={{
              paddingBottom: showBar ? Math.max(footerHeight, insets.bottom + 164) + 16 : insets.bottom + 24,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void onRefresh()}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            <CategoryHero category={data} compact={compact} />

            {/*
              What the bundle means, while there is still something to buy. On a
              sub-category page it moves into the footer as a note beside the Buy
              button instead — see `BundleNote`.
            */}
            {!compact && bundle && bundle.remaining_count > 0 && (
              <View className="gap-1.5">
                <Benefit compact={false} text={t('bundle.benefitAll', { name: bundle.name })} />
                {bundle.owned_count > 0 && (
                  <Benefit compact={false} text={t('bundle.benefitOwned', { count: bundle.owned_count })} />
                )}
                <Benefit compact={false} text={t('bundle.benefitForever')} />
              </View>
            )}

            {sections.length > 0 && <CourseOrderHint text={t('courses.orderHint')} compact={compact} />}

            {sections.length === 0 ? (
              <EmptyState icon={BookOpen} title={t('bundle.emptyTitle')} body={t('bundle.emptyBody')} />
            ) : (
              sections.map((section) => (
                <View key={section.key} className="gap-2.5">
                  {section.title !== null && (
                    <View className="flex-row items-center justify-between gap-2">
                      {compact ? (
                        <Text variant="label" className="flex-1 text-[10px] leading-4" numberOfLines={1}>
                          {section.title} · {t('bundle.coursesCount', { count: section.courses.length })}
                        </Text>
                      ) : (
                        /*
                         * On a main category's page each sub-category is a section of
                         * its own, so its name reads as a heading — navy, larger, with
                         * an accent bar — rather than a grey label lost among tiles.
                         */
                        <View className="flex-1 flex-row items-center gap-2">
                          <View className="h-4 w-1 rounded-full bg-primary" />
                          <Text
                            variant="none"
                            className="shrink text-[15px] font-semibold leading-6 text-primary"
                            numberOfLines={1}
                          >
                            {section.title}
                          </Text>
                          <Text variant="caption" className="shrink-0 text-[12px] leading-5">
                            {t('bundle.coursesCount', { count: section.courses.length })}
                          </Text>
                        </View>
                      )}
                      {/* A sub-category that is its own bundle is bought on its own page. */}
                      {section.ownBundleId !== null && section.ownBundleId !== data.id && (
                        <Pressable
                          accessibilityRole="link"
                          hitSlop={10}
                          onPress={() =>
                            router.push({ pathname: '/category/[id]', params: { id: section.ownBundleId ?? 0 } })
                          }
                          className="flex-row items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 active:opacity-80"
                        >
                          <Package size={12} color={colors.primary} />
                          <Text
                            className={cn(
                              'font-semibold text-primary',
                              compact ? 'text-[10px] leading-4' : 'text-[11px] leading-4',
                            )}
                          >
                            {t('bundle.sectionLink')}
                          </Text>
                          <ChevronRight size={12} color={colors.primary} />
                        </Pressable>
                      )}
                    </View>
                  )}
                  <CourseGrid courses={section.courses} onOpen={openCourse} compact={compact} />
                </View>
              ))
            )}
          </ScrollView>

          {bundle && (
            <View
              className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-5 pt-3"
              style={{ paddingBottom: insets.bottom + 12 }}
              onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
            >
              {/*
                On a sub-category page the points sit right above the button, as a
                note — the last thing read before paying, at the moment it matters.
              */}
              {compact && bundle.remaining_count > 0 && <BundleNote bundle={bundle} />}

              <BundleActionBar
                bundle={bundle}
                paymentsEnabled={paymentsEnabled}
                isBuying={isBuying}
                onBuy={() => buy(bundle.category_id)}
                onContinue={nextCourse ? () => openCourse(nextCourse) : undefined}
                compact={compact}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

interface CourseSection {
  key: string;
  /** Null when the list is not split — one chip picked, or no sub-categories. */
  title: string | null;
  /** Set when this section is a sub-category sold as its own bundle — bought on its page. */
  ownBundleId: number | null;
  courses: StudentCourseSummary[];
}

/**
 * The courses split by where they sit: those directly in this category first,
 * then one section per sub-category, in the admin's order. A picked chip shows
 * just that sub-category, unheaded. Within a section the server's order stands —
 * it is the "Course 1, Course 2…" path, and each section numbers from 1.
 */
function groupCourses(category: StudentCategoryDetail, subId: number | null): CourseSection[] {
  if (subId !== null) {
    const courses = category.courses.filter((course) => course.category_id === subId);
    const child = category.children.find((candidate) => candidate.id === subId);
    return courses.length > 0
      ? [
          {
            key: `sub-${subId}`,
            // Headed only when there is a bundle link to show beside it.
            title: child?.own_bundle ? child.name : null,
            ownBundleId: child?.own_bundle ? subId : null,
            courses,
          },
        ]
      : [];
  }

  if (category.children.length === 0) {
    return category.courses.length > 0
      ? [{ key: 'all', title: null, ownBundleId: null, courses: category.courses }]
      : [];
  }

  const sections: CourseSection[] = [];
  const direct = category.courses.filter((course) => course.category_id === category.id);
  if (direct.length > 0) {
    sections.push({ key: 'direct', title: category.name, ownBundleId: null, courses: direct });
  }

  for (const child of category.children) {
    const courses = category.courses.filter((course) => course.category_id === child.id);
    if (courses.length > 0) {
      sections.push({
        key: `sub-${child.id}`,
        title: child.name,
        ownBundleId: child.own_bundle ? child.id : null,
        courses,
      });
    }
  }

  return sections;
}

/** Two tiles a row. Plain rows rather than a FlatList — this already scrolls. */
function CourseGrid({
  courses,
  onOpen,
  compact,
}: {
  courses: StudentCourseSummary[];
  onOpen: (course: StudentCourseSummary) => void;
  compact: boolean;
}) {
  const rows: StudentCourseSummary[][] = [];
  for (let index = 0; index < courses.length; index += 2) rows.push(courses.slice(index, index + 2));

  return (
    <View className="gap-2.5">
      {rows.map((row) => (
        <View key={row.map((course) => course.id).join('-')} className="flex-row gap-2.5">
          {row.map((course) => (
            <View key={course.id} className="w-[47%] grow">
              {/* A browsing surface: a tap opens the course; buying happens in the bar below. */}
              <CourseGridCard
                course={course}
                onPress={() => onOpen(course)}
                showPurchase={false}
                compact={compact}
              />
            </View>
          ))}
          {/* Keeps a lone last tile half-width instead of stretching across. */}
          {row.length === 1 && <View className="w-[47%] grow" />}
        </View>
      ))}
    </View>
  );
}

/** The tinted header: the category's glyph or image, name, and how much is inside. */
function CategoryHero({ category, compact }: { category: StudentCategoryDetail; compact: boolean }) {
  const { t } = useTranslation();
  const Glyph = categoryIcon(category.name, category.icon ?? category.parent?.icon ?? null);
  const length = formatCourseLength(category.total_duration_seconds);

  return (
    <View
      className={cn(
        'flex-row items-center gap-3 rounded-2xl border border-category-2-foreground/15 bg-category-2',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <View
        className={cn(
          'items-center justify-center rounded-full border-2 border-card bg-card',
          compact ? 'h-12 w-12' : 'h-14 w-14',
        )}
      >
        {category.icon_image_url ? (
          <Image
            source={{ uri: category.icon_image_url }}
            style={compact ? { width: 26, height: 26 } : { width: 32, height: 32 }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Glyph size={compact ? 22 : 26} color={colors['category-2-foreground']} />
        )}
      </View>

      <View className="flex-1 gap-0.5">
        {/* Where this sub-category sits — context, not a heading, so it stays quiet. */}
        {category.parent && (
          <Text variant="none" className="text-[11px] leading-[18px] text-muted-foreground" numberOfLines={1}>
            {category.parent.name}
          </Text>
        )}
        <Text
          variant={compact ? 'none' : 'title'}
          className={compact ? 'text-[17px] font-semibold leading-6 text-primary' : undefined}
          numberOfLines={2}
        >
          {category.name}
        </Text>
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <View className="flex-row items-center gap-1">
            <BookOpen size={compact ? 12 : 13} color={colors.primary} />
            <Text variant="caption" className={compact ? 'text-[12px] leading-5' : undefined}>
              {t('bundle.coursesCount', { count: category.courses_count })}
            </Text>
          </View>
          {length !== '' && (
            <View className="flex-row items-center gap-1">
              <Clock size={compact ? 12 : 13} color={colors.primary} />
              <Text variant="caption" className={compact ? 'text-[12px] leading-5' : undefined}>
                {length}
              </Text>
            </View>
          )}
        </View>

        {category.selling_mode === 'bundle' && (
          <View className="mt-1 self-start rounded-full bg-primary px-2.5 py-0.5">
            <Text
              className={cn(
                'font-semibold uppercase tracking-wider text-primary-foreground',
                compact ? 'text-[9px] leading-4' : 'text-[10px]',
              )}
            >
              {t('bundle.badge')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * "Good to know": the bundle's points as a small note above the Buy button on a
 * sub-category page. A light navy tint and border set it apart as information
 * to read, without competing with the button under it.
 */
function BundleNote({ bundle }: { bundle: Bundle }) {
  const { t } = useTranslation();

  return (
    <View className="mb-2.5 gap-1 rounded-lg border border-primary/15 bg-primary-soft px-2.5 py-2">
      <View className="flex-row items-center gap-1">
        <Info size={11} color={colors.primary} />
        <Text variant="none" className="text-[11px] font-semibold leading-4 text-primary">
          {t('bundle.importantTitle')}
        </Text>
      </View>
      <Benefit compact text={t('bundle.benefitAll', { name: bundle.name })} />
      {bundle.owned_count > 0 && (
        <Benefit compact text={t('bundle.benefitOwned', { count: bundle.owned_count })} />
      )}
      <Benefit compact text={t('bundle.benefitForever')} />
    </View>
  );
}

/** Any character in the Sinhala Unicode block. */
const SINHALA = /[\u0D80-\u0DFF]/;

function Benefit({ text, compact }: { text: string; compact: boolean }) {
  /*
   * 8px footnote size, at the client's request. 11px leading in Latin script;
   * Sinhala keeps 13px, the 1.6x floor below which its loops clip
   * (mobile/CLAUDE.md §4) — the same split `CategoryCard` makes.
   */
  const lineHeight = compact ? (SINHALA.test(text) ? 13 : 11) : undefined;

  return (
    <View className={cn('flex-row items-start', compact ? 'gap-1' : 'gap-2')}>
      <View
        className={cn(
          'items-center justify-center rounded-full',
          // White disc on the tinted callout; the soft green one on a plain page.
          compact ? 'mt-px h-2.5 w-2.5 bg-card' : 'mt-0.5 h-5 w-5 bg-success-soft',
        )}
      >
        <Check size={compact ? 7 : 12} color={colors.success} />
      </View>
      <Text
        variant="body"
        className={cn('flex-1', compact ? 'text-[8px] text-foreground' : 'text-[13px] leading-5')}
        style={lineHeight === undefined ? undefined : { lineHeight }}
      >
        {text}
      </Text>
    </View>
  );
}

/**
 * The pinned bar, mirroring the course page's: everything owned → keep
 * learning; something left → what is left, its price, and Buy; payments off →
 * the price and a disabled "Coming soon", like a paid course.
 */
function BundleActionBar({
  bundle,
  paymentsEnabled,
  isBuying,
  onBuy,
  onContinue,
  compact,
}: {
  bundle: Bundle;
  paymentsEnabled: boolean;
  isBuying: boolean;
  onBuy: () => void;
  onContinue?: () => void;
  compact: boolean;
}) {
  const { t } = useTranslation();
  // One step down on a sub-category page, like the rest of it.
  const captionClass = cn('mb-2 text-center', compact && 'text-[12px] leading-5');
  const buttonSize = compact ? 'md' : 'lg';

  if (bundle.remaining_count === 0) {
    return (
      <>
        <Text variant="caption" className={captionClass}>
          {t('bundle.ownedAll')}
        </Text>
        {onContinue && (
          <Button label={t('courses.continueLearning')} icon={Play} size={buttonSize} fullWidth onPress={onContinue} />
        )}
      </>
    );
  }

  const price = formatMoney(bundle.remaining_price_cents, bundle.currency);
  // Only free courses left: buying enrols them straight away, no payment.
  const onlyFreeLeft = bundle.remaining_price_cents === 0;

  if (!paymentsEnabled && !onlyFreeLeft) {
    return (
      <>
        <Text variant="caption" className={captionClass}>
          {t('enrol.comingSoonBody')}
        </Text>
        <Button label={t('enrol.comingSoonPriced', { price })} icon={Clock} size={buttonSize} fullWidth disabled />
      </>
    );
  }

  return (
    <>
      {/* What they are paying for, in one line: how many, and that owned courses are not charged. */}
      <Text variant="caption" className={captionClass}>
        {bundle.owned_count > 0
          ? t('bundle.ownedSome', { owned: bundle.owned_count, count: bundle.remaining_count })
          : t('bundle.buyingAll', { count: bundle.remaining_count, name: bundle.name })}
      </Text>

      <Button
        label={
          onlyFreeLeft
            ? t('bundle.getFree', { count: bundle.remaining_count })
            : t('bundle.buyRemaining', { count: bundle.remaining_count, price })
        }
        icon={ShieldCheck}
        size={buttonSize}
        fullWidth
        loading={isBuying}
        disabled={!bundle.is_available}
        onPress={onBuy}
      />
    </>
  );
}
