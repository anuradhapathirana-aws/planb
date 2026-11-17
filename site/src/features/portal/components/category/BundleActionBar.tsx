import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Loader2, Play, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePaymentsEnabled } from '@/features/catalogue/useCourseDetail';
import { useBundlePurchase } from '@/features/catalogue/useBundleDetail';
import { paths } from '@/routes/paths';
import { formatMoney } from '@shared/lib/formatters';
import type { StudentCategoryDetail, StudentCourseSummary } from '@shared/types/studentCourse';

type Bundle = NonNullable<StudentCategoryDetail['bundle']>;

interface BundleActionBarProps {
  bundle: Bundle;
  /** The course "Continue learning" opens once everything is owned. */
  nextCourse: StudentCourseSummary | null;
}

/**
 * The Category page's buy bar — the app's `BundleActionBar`, pinned to the
 * bottom of the screen above the tab bar. Every figure is the server's quote
 * for THIS student: the price of what they do not own yet, never the list
 * price, and never an amount sent back (root CLAUDE.md, Payments).
 *
 *  - owns all of it → "You own every course" and Continue learning;
 *  - paid, payments off → "Coming soon · price", disabled;
 *  - otherwise → Buy (or Get free) the remaining N, priced by the server.
 */
export function BundleActionBar({ bundle, nextCourse }: BundleActionBarProps) {
  const { t } = useTranslation();
  const paymentsEnabled = usePaymentsEnabled();
  const purchase = useBundlePurchase();

  let caption: string;
  let action: React.ReactNode;

  if (bundle.remaining_count === 0) {
    caption = t('bundle.ownedAll');
    action = nextCourse ? (
      <Button asChild size="lg" className="w-full">
        <Link to={paths.app.courseDetail(nextCourse.id)}>
          <Play aria-hidden="true" />
          {t('courses.continueLearning')}
        </Link>
      </Button>
    ) : null;
  } else {
    const price = formatMoney(bundle.remaining_price_cents, bundle.currency);
    const onlyFreeLeft = bundle.remaining_price_cents === 0;

    if (!paymentsEnabled && !onlyFreeLeft) {
      caption = t('enrol.comingSoonBody');
      action = (
        <Button size="lg" className="w-full" disabled>
          <Clock aria-hidden="true" />
          {t('enrol.comingSoonPriced', { price })}
        </Button>
      );
    } else {
      caption =
        bundle.owned_count > 0
          ? t('bundle.ownedSome', { owned: bundle.owned_count, count: bundle.remaining_count })
          : t('bundle.buyingAll', { count: bundle.remaining_count, name: bundle.name });
      action = (
        <Button
          size="lg"
          variant="accent"
          className="w-full"
          disabled={!bundle.is_available || purchase.isPending}
          onClick={() => purchase.mutate(bundle.category_id)}
        >
          {purchase.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          {onlyFreeLeft
            ? t('bundle.getFree', { count: bundle.remaining_count })
            : t('bundle.buyRemaining', { count: bundle.remaining_count, price })}
        </Button>
      );
    }
  }

  return (
    // Sticky just above the floating tab bar on a phone; near the bottom edge on a laptop.
    <div className="sticky bottom-[calc(var(--portal-tabbar-clearance)+0.5rem)] z-10 space-y-2 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur md:bottom-4 md:mx-auto md:max-w-md">
      <p className="text-center text-[12px] leading-5 text-muted-foreground">{caption}</p>
      {action}
    </div>
  );
}
