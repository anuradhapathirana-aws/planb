import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { CategoryStrip, CategoryStripSkeleton } from '@/features/portal/components/home/CategoryStrip';
import { CourseSearchSheet } from '@/features/portal/components/home/CourseSearchSheet';
import { CourseStrip, CourseStripSkeleton } from '@/features/portal/components/home/CourseStrip';
import { ExchangeRateCard } from '@/features/portal/components/home/ExchangeRateCard';
import { HomeBannerCarousel } from '@/features/portal/components/home/HomeBannerCarousel';
import { HomeHeader } from '@/features/portal/components/home/HomeHeader';
import { HomeSearchBar } from '@/features/portal/components/home/HomeSearchBar';
import { HomeSection } from '@/features/portal/components/home/HomeSection';
import { ProfileCompletionStrip } from '@/features/portal/components/home/ProfileCompletionStrip';
import { useHomeSearch } from '@/features/portal/components/home/useHomeSearch';
import { useWishlistToggle } from '@/features/portal/hooks/useWishlistToggle';
import {
  useCourseCategories,
  useExchangeRate,
  useHomeBanners,
  useStudentCourses,
} from '@/features/portal/queries';
import { paths } from '@/routes/paths';
import { useSessionStore } from '@/stores/sessionStore';
import { profileCompletion } from '@shared/lib/profileCompletion';

/** How many courses the Popular strip shows before "View all" takes over. */
const POPULAR_LIMIT = 10;

/**
 * The portal Home on a phone — the mobile app's Home screen
 * (`mobile/app/(tabs)/index.tsx`), section for section: greeting, search,
 * profile nudge, promo carousel, exchange rate, Top Categories, Popular Courses.
 *
 * Same endpoints and the same cache keys as the rest of the portal, so opening
 * Courses afterwards costs nothing. Each block loads and fails on its own; the
 * nice-to-haves (rate, categories) simply disappear on failure, while the
 * courses strip — what the student came for — says so and offers a retry.
 *
 * **Popular Courses leaves out what the student already owns**: Home is the
 * shop window, and owned courses live on the Courses tab with their progress.
 */
export function PortalHomeMobile() {
  const { t } = useTranslation();
  const student = useSessionStore((s) => s.student);

  const courses = useStudentCourses();
  const banners = useHomeBanners();
  const rate = useExchangeRate();
  const categories = useCourseCategories();
  const wishlist = useWishlistToggle();

  const search = useHomeSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFromFilter, setSearchFromFilter] = useState(false);

  const completion = profileCompletion(student);

  const popular = useMemo(
    () =>
      (courses.data ?? [])
        .filter((course) => !course.is_enrolled)
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
        .slice(0, POPULAR_LIMIT),
    [courses.data],
  );

  const openSearch = (fromFilter: boolean) => {
    setSearchFromFilter(fromFilter);
    setSearchOpen(true);
  };

  return (
    // 28px between sections; the top group (search, nudge, carousel, rate) sits closer, at 16.
    <div className="space-y-7">
      <div className="space-y-4">
        <HomeHeader student={student} />
        <HomeSearchBar
          onSearch={() => openSearch(false)}
          onFilter={() => openSearch(true)}
          activeFilters={search.categoryId === null ? 0 : 1}
        />
        {!completion.isComplete ? <ProfileCompletionStrip percent={completion.percent} /> : null}
        <HomeBannerCarousel banners={banners.data} loading={banners.isPending} />
        <ExchangeRateCard rate={rate.data} />
      </div>

      {categories.isPending ? (
        <HomeSection title={t('home.categoriesTitle')}>
          <CategoryStripSkeleton />
        </HomeSection>
      ) : (categories.data?.length ?? 0) > 0 ? (
        <HomeSection title={t('home.categoriesTitle')} viewAllTo={paths.app.browse()}>
          <CategoryStrip categories={categories.data ?? []} />
        </HomeSection>
      ) : null}

      <HomeSection title={t('home.popularTitle')} viewAllTo={paths.app.browse()}>
        {courses.isPending ? (
          <CourseStripSkeleton />
        ) : courses.isError ? (
          <EmptyState
            icon={WifiOff}
            title={t('courses.loadFailedTitle')}
            body={t('courses.loadFailedBody')}
            className="bg-card py-8"
            action={
              <Button variant="outline" size="sm" onClick={() => void courses.refetch()}>
                {t('common.retry')}
              </Button>
            }
          />
        ) : popular.length === 0 ? (
          // Owning everything Plan B sells is a good outcome, not a failure.
          <EmptyState icon={GraduationCap} title={t('browse.emptyTitle')} body={t('browse.emptyBody')} className="py-8" />
        ) : (
          <CourseStrip courses={popular} onToggleWishlist={wishlist.toggle} />
        )}
      </HomeSection>

      <CourseSearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        focusInput={!searchFromFilter}
        search={search}
        categories={categories.data ?? []}
      />
    </div>
  );
}
