import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Layers,
  Loader2,
  MonitorSmartphone,
  Package,
  Play,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSignInDialog } from '@/features/auth/hooks/useSignInDialog';
import { useEnrolCourse, usePaymentsEnabled } from '@/features/catalogue/useCourseDetail';
import { useStudentCourses } from '@/features/portal/queries';
import { useSessionStore } from '@/stores/sessionStore';
import { paths } from '@/routes/paths';
import { formatCourseLength, formatMoney } from '@shared/lib/formatters';
import type { PublicCourseDetail } from '@shared/types/publicCourse';

/**
 * Price, the one action, and what the course includes.
 *
 * The action, in order of precedence:
 *  1. **Already enrolled** (signed in) → "Go to course", into the portal.
 *  2. **Sold only in a bundle** → the bundle, with its list price. The enrol
 *     endpoint refuses a single purchase anyway; this only draws the truth.
 *  3. **Paid while payments are off** → "Coming soon · price", disabled — the
 *     price stays visible (decision 2026-09-17), the purchase does not.
 *  4. **Otherwise** → Enrol. Signed out, it opens sign-in and comes back to
 *     THIS page (client decision 2026-09-26) — it never enrols or charges on
 *     the strength of a click made before signing in. Signed in, the server
 *     answers with an enrolment (free) or an order to pay (paid).
 *
 * All of it is presentation. The paywall is the 403 on the stream, progress
 * and paper endpoints, whatever this card draws.
 */
export function CourseEnrolCard({ course }: { course: PublicCourseDetail }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { openSignIn } = useSignInDialog();

  const student = useSessionStore((s) => s.student);
  const ownCourses = useStudentCourses({ enabled: student !== null });
  const paymentsEnabled = usePaymentsEnabled();
  const enrol = useEnrolCourse();

  const isEnrolled = (ownCourses.data ?? []).some((own) => own.id === course.id && own.is_enrolled);
  // Until we know, do not offer an owner a button to buy what they have.
  const checkingOwnership = student !== null && ownCourses.isPending;

  const price = course.is_free ? t('courses.free') : formatMoney(course.price_cents, course.currency);
  const length = formatCourseLength(course.total_duration_seconds);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {course.thumbnail_url ? (
        <img src={course.thumbnail_url} alt="" className="hidden aspect-video w-full object-cover lg:block" />
      ) : null}

      <div className="space-y-4 p-5">
        <p className="text-2xl font-semibold text-primary">
          {course.bundle ? t('site.catalogue.inBundle') : price}
        </p>

        {checkingOwnership ? (
          <Skeleton className="h-11 w-full" />
        ) : isEnrolled ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {t('site.course.enrolledNote')}
            </p>
            <Button asChild size="lg" className="w-full">
              <Link to={paths.app.courseDetail(course.id)}>
                <Play aria-hidden="true" />
                {t('site.course.goToCourse')}
              </Link>
            </Button>
          </div>
        ) : course.bundle ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('bundle.courseCaption', { name: course.bundle.name })}
            </p>
            <p className="text-sm font-medium text-foreground">
              {t('site.course.bundlePrice', {
                price: formatMoney(course.bundle.price_cents, course.bundle.currency),
              })}
            </p>
            <Button asChild size="lg" className="w-full">
              <Link to={paths.bundleDetail(course.bundle.category_id)}>
                <Package aria-hidden="true" />
                {t('bundle.viewBundle')}
              </Link>
            </Button>
          </div>
        ) : !course.is_free && !paymentsEnabled ? (
          <div className="space-y-2">
            <Button size="lg" className="w-full" disabled>
              <Clock aria-hidden="true" />
              {t('enrol.comingSoonPriced', { price })}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t('enrol.comingSoonBody')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              size="lg"
              variant="accent"
              className="w-full"
              disabled={enrol.isPending}
              onClick={() => (student ? enrol.mutate(course.id) : openSignIn(pathname))}
            >
              {enrol.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
              {course.is_free ? t('enrol.actionFree') : t('enrol.actionPriced', { price })}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {student ? (course.is_free ? null : t('enrol.paywallBody')) : t('site.course.signInFirst')}
            </p>
          </div>
        )}

        <div className="border-t pt-4">
          <h2 className="text-sm font-semibold text-foreground">{t('site.course.includesTitle')}</h2>
          <ul className="mt-2.5 space-y-2 text-sm text-muted-foreground">
            {length !== '' ? <Include icon={Clock}>{t('site.course.includesVideo', { length })}</Include> : null}
            {course.lessons_count > 0 ? (
              <Include icon={BookOpen}>{t('courses.lessonCount', { count: course.lessons_count })}</Include>
            ) : null}
            {course.topics_count > 0 ? (
              <Include icon={Layers}>{t('site.course.includesTopics', { count: course.topics_count })}</Include>
            ) : null}
            {course.assessment ? (
              <Include icon={ClipboardCheck}>
                {t('site.course.includesAssessment', { count: course.assessment.questions_count })}
              </Include>
            ) : null}
            <Include icon={MonitorSmartphone}>{t('site.course.includesDevices')}</Include>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Include({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      {children}
    </li>
  );
}
