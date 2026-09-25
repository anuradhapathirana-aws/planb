import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Plus, Search, SearchX, WifiOff, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { EnrolledCourseCard, EnrolledCourseCardSkeleton } from '@/features/portal/components/EnrolledCourseCard';
import { useStudentCourses } from '@/features/portal/queries';
import { paths } from '@/routes/paths';

/**
 * My Courses (`POR-3`, list half) — the courses this student is enrolled in,
 * and nothing else. The web counterpart of the mobile app's Courses tab.
 *
 * **Enrolled only, in the admin's course order.** Mobile dropped its All/Mine
 * toggle at the client's request: this page answers "how far am I?", and
 * finding something new is the catalogue's job, one click away in the header
 * and in the empty state. The order is the server's (category → Course 1,
 * Course 2 …), not progress, because Plan B's courses are a sequence.
 *
 * **Search filters in place, client-side.** A student owns a handful of
 * courses and they are all already loaded — a request per keystroke would buy
 * a spinner and nothing else. It appears only once there is more than one
 * course to filter.
 *
 * Reads the same `student/courses` cache as the portal home, so arriving here
 * from home costs no request.
 */
export function MyCoursesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const courses = useStudentCourses();

  const enrolled = useMemo(() => (courses.data ?? []).filter((course) => course.is_enrolled), [courses.data]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term === '') return enrolled;

    return enrolled.filter(
      (course) =>
        course.name.toLowerCase().includes(term) || (course.category_name ?? '').toLowerCase().includes(term),
    );
  }, [enrolled, query]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-xl font-semibold text-foreground sm:text-2xl">{t('courses.myTitle')}</h1>

        {/* The way to more courses from a page that deliberately shows none. */}
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to={paths.courses}>
            <Plus aria-hidden="true" />
            {t('courses.browse')}
          </Link>
        </Button>
      </header>

      {enrolled.length > 1 ? (
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('courses.mySearchPlaceholder')}
            aria-label={t('courses.mySearchLabel')}
            className="bg-card pr-10 pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {query !== '' ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('common.clearSearch')}
              className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}

      {courses.isPending ? (
        <ul className="grid gap-3 lg:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((slot) => (
            <li key={slot}>
              <EnrolledCourseCardSkeleton />
            </li>
          ))}
        </ul>
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
      ) : enrolled.length === 0 ? (
        // Nothing enrolled is a fixable problem, and the fix is one click away.
        <EmptyState
          icon={GraduationCap}
          title={t('courses.noneEnrolledTitle')}
          body={t('courses.noneEnrolledBody')}
          className="bg-card"
          action={
            <Button asChild size="sm">
              <Link to={paths.courses}>{t('courses.browseAll')}</Link>
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t('courses.noMatchTitle')}
          body={t('courses.noMatchBody')}
          className="bg-card"
          action={
            <Button variant="outline" size="sm" onClick={() => setQuery('')}>
              {t('common.clearSearch')}
            </Button>
          }
        />
      ) : (
        /*
          One column on a phone, two from a laptop up — every card stays a
          full, readable row while a typical shelf fits on one screen.
        */
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((course) => (
            <li key={course.id}>
              <EnrolledCourseCard course={course} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
