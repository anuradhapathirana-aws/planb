import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Plus, SearchX, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchField } from '@/components/shared/SearchField';
import { CourseListRow, CourseListRowSkeleton } from '@/features/portal/components/CourseListRow';
import { useStudentCourses } from '@/features/portal/queries';
import { paths } from '@/routes/paths';

/**
 * My Courses (`POR-3`) — the mobile app's Courses tab: the courses this student
 * is enrolled in, one row each with a progress ring, and nothing else. Finding
 * something new is Browse's job, one tap away in the header and the empty state.
 *
 * One design at every size (the client's choice): the app's rows, one column on
 * a phone and two from `md` up. On a phone the page draws its own title row, as
 * the app does, so the shell's logo bar is hidden here (`ownPhoneHeader`).
 *
 * The search box filters the enrolled list in place — a student owns a handful
 * of courses, all already loaded, so a request per keystroke would buy nothing.
 * It appears only once there is more than one course to filter.
 */
export function MyCoursesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const courses = useStudentCourses();

  const enrolled = useMemo(() => (courses.data ?? []).filter((course) => course.is_enrolled), [courses.data]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();

    return term === '' ? enrolled : enrolled.filter((course) => course.name.toLowerCase().includes(term));
  }, [enrolled, query]);

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-[28px] font-bold leading-10 text-primary">{t('courses.myTitle')}</h1>

        <Link
          to={paths.app.browse()}
          aria-label={t('courses.browseAll')}
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-[13px] font-semibold leading-5 text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50 hover:bg-border active:bg-border"
        >
          <Plus className="size-[15px]" aria-hidden="true" />
          {t('courses.browse')}
        </Link>
      </header>

      {enrolled.length > 1 ? (
        <SearchField
          value={query}
          onValueChange={setQuery}
          aria-label={t('courses.mySearchLabel')}
          placeholder={t('courses.mySearchPlaceholder')}
          className="md:max-w-md"
        />
      ) : null}

      {courses.isPending ? (
        <ul className="grid gap-2.5 md:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((slot) => (
            <li key={slot}>
              <CourseListRowSkeleton />
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
        // Nothing enrolled is a fixable problem, and the fix is one tap away.
        <EmptyState
          icon={GraduationCap}
          title={t('courses.noneEnrolledTitle')}
          body={t('courses.noneEnrolledBody')}
          className="bg-card"
          action={
            <Button asChild size="sm">
              <Link to={paths.app.browse()}>{t('courses.browseAll')}</Link>
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
        <ul className="grid gap-2.5 md:grid-cols-2">
          {visible.map((course) => (
            <li key={course.id}>
              <CourseListRow course={course} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
