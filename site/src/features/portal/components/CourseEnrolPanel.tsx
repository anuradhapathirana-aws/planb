import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Loader2, Package, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useEnrolCourse, usePaymentsEnabled } from '@/features/catalogue/useCourseDetail';
import { paths } from '@/routes/paths';
import { formatMoney } from '@shared/lib/formatters';
import type { StudentCourseDetail } from '@shared/types/studentCourse';

/**
 * The portal course page's panel for a course the student does not own yet —
 * the app's Course screen footer, in its three not-enrolled states:
 *
 *  - **sold in a bundle** → "View Course Bundle", the portal Category page,
 *    where the bundle is bought with its contents in view;
 *  - **paid while payments are off** → "Coming soon · price", disabled;
 *  - **otherwise** → Start for free / Enrol now · price. The server answers with
 *    an enrolment or an order to pay; nothing about price is decided here.
 *
 * Presentation only. The stream, progress and paper endpoints 403 without an
 * enrolment, whatever this panel offers.
 */
export function CourseEnrolPanel({ course }: { course: StudentCourseDetail }) {
  const { t } = useTranslation();
  const paymentsEnabled = usePaymentsEnabled();
  const enrol = useEnrolCourse();

  const bundle = course.sold_individually ? null : course.bundle;
  const price = course.is_free ? t('courses.free') : formatMoney(course.price_cents, course.currency);

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-2xl font-semibold text-primary">{bundle ? t('bundle.tileLabel') : price}</p>

      {bundle ? (
        <>
          <p className="text-sm text-muted-foreground">{t('bundle.courseCaption', { name: bundle.name })}</p>
          <Button asChild size="lg" className="w-full">
            <Link to={paths.app.category(bundle.category_id)}>
              <Package aria-hidden="true" />
              {t('bundle.viewBundle')}
            </Link>
          </Button>
        </>
      ) : !course.is_free && !paymentsEnabled ? (
        <>
          <Button size="lg" className="w-full" disabled>
            <Clock aria-hidden="true" />
            {t('enrol.comingSoonPriced', { price })}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t('enrol.comingSoonBody')}</p>
        </>
      ) : (
        <>
          <Button
            size="lg"
            variant="accent"
            className="w-full"
            disabled={enrol.isPending}
            onClick={() => enrol.mutate(course.id)}
          >
            {enrol.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
            {course.is_free ? t('enrol.actionFree') : t('enrol.actionPriced', { price })}
          </Button>
          {!course.is_free ? <p className="text-center text-xs text-muted-foreground">{t('enrol.paywallBody')}</p> : null}
        </>
      )}
    </div>
  );
}
