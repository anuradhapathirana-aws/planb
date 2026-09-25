import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { AnnouncementsStrip } from '@/features/portal/components/AnnouncementsStrip';
import { ChecklistSummaryCard, ChecklistSummarySkeleton } from '@/features/portal/components/ChecklistSummaryCard';
import { ContinueLearningCard, ContinueLearningSkeleton } from '@/features/portal/components/ContinueLearningCard';
import { MyCoursesCard, MyCoursesSkeleton } from '@/features/portal/components/MyCoursesCard';
import { PortalStatTiles } from '@/features/portal/components/PortalStatTiles';
import { useChecklists, useHomeBanners, useStudentCourses } from '@/features/portal/queries';
import { useSessionStore } from '@/stores/sessionStore';

/**
 * Portal home (`POR-2`) — where signing in on the website lands.
 *
 * Answers "where am I up to?": the course to pick up next, the numbers behind
 * it, the checklist, and anything Plan B has announced. Three requests, all the
 * same endpoints the mobile app uses, and each block loads and fails on its own
 * so a slow checklist never holds the course card hostage.
 *
 * Laid out to fit a laptop screen without scrolling (root CLAUDE.md §8
 * "Optimized screen"): learning on the left, the smaller summaries on the
 * right. On a phone it becomes one column in reading order.
 */
export function PortalHomePage() {
  const { t } = useTranslation();
  const student = useSessionStore((s) => s.student);

  const courses = useStudentCourses();
  const checklists = useChecklists();
  const banners = useHomeBanners();

  const firstName = student?.full_name?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          {firstName ? t('site.portal.home.greeting', { name: firstName }) : t('home.greetingFallback')}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('site.portal.home.subtitle')}</p>
      </header>

      <PortalStatTiles courses={courses.data} phases={checklists.data} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {courses.isPending ? (
            <>
              <ContinueLearningSkeleton />
              <MyCoursesSkeleton />
            </>
          ) : courses.isError ? (
            <EmptyState
              icon={WifiOff}
              title={t('courses.loadFailedTitle')}
              body={t('courses.loadFailedBody')}
              className="bg-card"
              action={
                <Button variant="outline" size="sm" onClick={() => void courses.refetch()}>
                  {t('common.retry')}
                </Button>
              }
            />
          ) : (
            <>
              <ContinueLearningCard courses={courses.data} />
              <MyCoursesCard courses={courses.data} />
            </>
          )}
        </div>

        <div className="space-y-4">
          {checklists.isPending ? (
            <ChecklistSummarySkeleton />
          ) : checklists.isError ? (
            <EmptyState
              icon={WifiOff}
              title={t('checklist.loadFailedTitle')}
              body={t('checklist.loadFailedBody')}
              className="bg-card py-8"
              action={
                <Button variant="outline" size="sm" onClick={() => void checklists.refetch()}>
                  {t('common.retry')}
                </Button>
              }
            />
          ) : (
            <ChecklistSummaryCard phases={checklists.data} />
          )}

          {/* Announcements are a nice-to-have: absent while loading or on failure,
              never an error box for a block the student did not ask for. */}
          {banners.data ? <AnnouncementsStrip banners={banners.data} /> : null}
        </div>
      </div>
    </div>
  );
}
