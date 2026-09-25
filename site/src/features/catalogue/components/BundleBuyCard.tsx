import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, Clock, Infinity as InfinityIcon, Loader2, Package, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSignInDialog } from '@/features/auth/hooks/useSignInDialog';
import { usePaymentsEnabled } from '@/features/catalogue/useCourseDetail';
import { useBundlePurchase } from '@/features/catalogue/useBundleDetail';
import { paths } from '@/routes/paths';
import { formatCourseLength, formatMoney } from '@shared/lib/formatters';
import type { PublicCategoryDetail } from '@shared/types/publicCourse';
import type { StudentCategoryDetail } from '@shared/types/studentCourse';

/**
 * The bundle's price and its one action.
 *
 * **Two prices, and never mixed up.** Signed out, the visitor sees the bundle's
 * LIST price — every course in it. Signed in, they see THEIR price: the courses
 * they do not own yet, from the server's quote. A student is never charged
 * twice for a course, and the page says so before they sign in.
 *
 * The action, in order:
 *  1. Signed in, checking what they own → a placeholder, never a buy button
 *     offered to someone who may already own everything.
 *  2. Signed in and owns every course → "Go to my courses".
 *  3. Something to pay for while payments are off → "Coming soon · price".
 *  4. Signed out → the list-price button opens sign-in and returns HERE
 *     (client decision 2026-09-26): nothing is bought on a click made before
 *     signing in.
 *  5. Signed in → buy the remainder, if the server says the bundle is on sale
 *     (`is_available`); free remainders are enrolled on the spot.
 *
 * All presentation: the purchase endpoint re-prices and re-checks everything.
 */
export function BundleBuyCard({
  category,
  personal,
  personalFailed,
  onRetryPersonal,
  signedIn,
}: {
  category: PublicCategoryDetail;
  /** The student's own view; undefined while loading or when signed out. */
  personal: StudentCategoryDetail | undefined;
  /** The student's own quote could not be loaded — offer a retry, never a guessed price. */
  personalFailed: boolean;
  onRetryPersonal: () => void;
  signedIn: boolean;
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { openSignIn } = useSignInDialog();
  const paymentsEnabled = usePaymentsEnabled();
  const purchase = useBundlePurchase();

  const listed = category.bundle;
  if (!listed) return null;

  const quote = personal?.bundle ?? null;
  const listPrice = formatMoney(listed.price_cents, listed.currency);
  const length = formatCourseLength(category.total_duration_seconds);

  let priceLabel = t('site.bundle.listPrice');
  let price = listPrice;
  let action: ReactNode;

  if (signedIn && !personal && personalFailed) {
    action = (
      <Button size="lg" variant="outline" className="w-full" onClick={onRetryPersonal}>
        {t('common.retry')}
      </Button>
    );
  } else if (signedIn && !personal) {
    action = <Skeleton className="h-11 w-full" />;
  } else if (signedIn && quote && quote.remaining_count === 0) {
    action = (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t('bundle.ownedAll')}
        </p>
        <Button asChild size="lg" className="w-full">
          <Link to={paths.app.courses}>{t('site.bundle.goToMyCourses')}</Link>
        </Button>
      </div>
    );
  } else if (signedIn && quote) {
    priceLabel = t('site.bundle.yourPrice');
    price = formatMoney(quote.remaining_price_cents, quote.currency);
    const isFree = quote.remaining_price_cents === 0;

    action =
      !isFree && !paymentsEnabled ? (
        <ComingSoon price={price} />
      ) : (
        <div className="space-y-2">
          {quote.owned_count > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('bundle.ownedSome', { owned: quote.owned_count, count: quote.remaining_count })}
            </p>
          ) : null}
          <Button
            size="lg"
            variant="accent"
            className="w-full"
            disabled={!quote.is_available || purchase.isPending}
            onClick={() => purchase.mutate(listed.category_id)}
          >
            {purchase.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
            {isFree
              ? t('bundle.getFree', { count: quote.remaining_count })
              : t('bundle.buyRemaining', { count: quote.remaining_count, price })}
          </Button>
        </div>
      );
  } else if (listed.price_cents > 0 && !paymentsEnabled) {
    action = <ComingSoon price={listPrice} />;
  } else {
    action = (
      <div className="space-y-2">
        <Button size="lg" variant="accent" className="w-full" onClick={() => openSignIn(pathname)}>
          <ShieldCheck aria-hidden="true" />
          {listed.price_cents === 0
            ? t('bundle.getFree', { count: category.courses_count })
            : t('bundle.buyRemaining', { count: category.courses_count, price: listPrice })}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t('site.course.signInFirst')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{priceLabel}</p>
          <p className="mt-0.5 text-2xl font-semibold text-primary">{price}</p>
          {!signedIn ? <p className="mt-1 text-xs text-muted-foreground">{t('site.bundle.ownedNote')}</p> : null}
        </div>

        {action}

        <div className="border-t pt-4">
          <h2 className="text-sm font-semibold text-foreground">{t('site.course.includesTitle')}</h2>
          <ul className="mt-2.5 space-y-2 text-sm text-muted-foreground">
            <Include icon={Package}>{t('bundle.coursesCount', { count: category.courses_count })}</Include>
            {category.lessons_count > 0 ? (
              <Include icon={BookOpen}>{t('courses.lessonCount', { count: category.lessons_count })}</Include>
            ) : null}
            {length !== '' ? <Include icon={Clock}>{t('site.course.includesVideo', { length })}</Include> : null}
            <Include icon={InfinityIcon}>{t('bundle.benefitForever')}</Include>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ComingSoon({ price }: { price: string }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Button size="lg" className="w-full" disabled>
        <Clock aria-hidden="true" />
        {t('enrol.comingSoonPriced', { price })}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t('enrol.comingSoonBody')}</p>
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
