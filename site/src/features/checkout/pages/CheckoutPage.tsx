import { useState } from 'react';
import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Hourglass, Loader2, LogIn, RefreshCw, SearchX, WifiOff, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/shared/Container';
import { EmptyState } from '@/components/shared/EmptyState';
import { FullScreenSpinner } from '@/components/shared/FullScreenSpinner';
import { useSignInDialog } from '@/features/auth/hooks/useSignInDialog';
import { BankTransferPanel } from '@/features/checkout/components/BankTransferPanel';
import { OrderSummaryCard } from '@/features/checkout/components/OrderSummaryCard';
import { useOrder } from '@/features/checkout/queries';
import { useSessionStore } from '@/stores/sessionStore';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import type { StudentOrder } from '@shared/types/studentOrder';

/**
 * Checkout (`PUB-8`) — `/checkout/:orderId`. **Bank transfer only for now**
 * (client instruction, 2026-09-26); card payment comes later.
 *
 * The page's whole job is to report what the SERVER says about the order and,
 * while it is payable, take a bank-transfer slip. Nothing here can mark it paid:
 * a slip moves it to "being checked" and only an admin's approval settles it.
 * Every state has its own panel, because "nothing visibly happened" is how a
 * student ends up paying twice.
 *
 * It lives in the public shell (it is reached from course and bundle pages) but
 * needs a signed-in student; the order endpoint 404s another student's order
 * on the server, whatever this page shows.
 */
export function CheckoutPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { orderId } = useParams();
  const { openSignIn } = useSignInDialog();
  const id = orderId !== undefined && /^\d{1,9}$/.test(orderId) ? Number(orderId) : null;

  const student = useSessionStore((s) => s.student);
  const sessionResolved = useSessionStore((s) => s.isResolved);
  const order = useOrder(id, student !== null);

  const head = (
    <Helmet>
      <title>{t('site.checkout.metaTitle')}</title>
      {/* A personal page: never in a search index. */}
      <meta name="robots" content="noindex" />
    </Helmet>
  );

  if (!sessionResolved) return <FullScreenSpinner />;

  if (!student) {
    return (
      <Container className="py-16">
        {head}
        <EmptyState
          icon={LogIn}
          title={t('site.checkout.signInTitle')}
          body={t('site.checkout.signInBody')}
          action={<Button onClick={() => openSignIn(pathname)}>{t('site.nav.signIn')}</Button>}
        />
      </Container>
    );
  }

  const status = axios.isAxiosError(order.error) ? order.error.response?.status : undefined;

  if (id === null || status === 404 || status === 403) {
    return (
      <Container className="py-16">
        {head}
        <EmptyState
          icon={SearchX}
          title={t('site.checkout.notFoundTitle')}
          body={t('site.checkout.notFoundBody')}
          action={
            <Button asChild variant="outline">
              <Link to={paths.courses}>{t('courses.browseAll')}</Link>
            </Button>
          }
        />
      </Container>
    );
  }

  if (order.isError) {
    return (
      <Container className="py-16">
        {head}
        <EmptyState
          icon={WifiOff}
          title={t('payment.loadFailedTitle')}
          body={t('payment.loadFailedBody')}
          action={
            <Button variant="outline" onClick={() => void order.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      {head}
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{t('payment.title')}</h1>

      {order.data ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-5 lg:gap-8">
          {/* Summary first in source order: on a phone, what you are paying for comes before how. */}
          <aside className="lg:order-last lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <OrderSummaryCard order={order.data} />
            </div>
          </aside>

          <div className="min-w-0 lg:col-span-3">
            <OrderState order={order.data} onCheck={() => order.refetch()} />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-5 lg:gap-8">
          <Skeleton className="h-64 w-full rounded-xl lg:order-last lg:col-span-2" />
          <Skeleton className="h-96 w-full rounded-xl lg:col-span-3" />
        </div>
      )}
    </Container>
  );
}

/** The panel for whatever state the server says the order is in. */
function OrderState({ order, onCheck }: { order: StudentOrder; onCheck: () => Promise<{ data?: StudentOrder; isError: boolean }> }) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);

  async function checkStatus() {
    setChecking(true);
    const result = await onCheck();
    setChecking(false);

    if (result.isError) toast.error(t('payment.checkStatusFailed'));
    else if (result.data?.status === 'awaiting_verification') toast.info(t('payment.stillChecking'));
  }

  if (order.status === 'paid') {
    const { type, id } = order.item;
    const next =
      type === 'course'
        ? { to: paths.app.courseDetail(id), label: t('payment.startLearning') }
        : type === 'service'
          ? { to: paths.app.services, label: t('payment.viewService') }
          : { to: paths.app.courses, label: t('site.checkout.goToMyCourses') };

    return (
      <StatePanel icon={CheckCircle2} tone="success" title={t('payment.paidTitle')}>
        <p>
          {type === 'service' ? t('payment.paidBodyService') : type === 'category' ? t('bundle.paidBody') : t('payment.paidBody')}
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link to={next.to}>{next.label}</Link>
        </Button>
      </StatePanel>
    );
  }

  if (order.status === 'awaiting_verification') {
    return (
      <StatePanel icon={Hourglass} tone="warning" title={t('payment.awaitingTitle')}>
        <p>{t('payment.awaitingBody')}</p>
        <Button variant="outline" className="mt-4" disabled={checking} onClick={() => void checkStatus()}>
          {checking ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
          {t('payment.checkStatus')}
        </Button>
      </StatePanel>
    );
  }

  if (order.status === 'cancelled' || order.status === 'refunded') {
    return (
      <StatePanel icon={Ban} tone="muted" title={t('site.checkout.closedTitle')}>
        <p>{t('site.checkout.closedBody')}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to={paths.courses}>{t('courses.browseAll')}</Link>
        </Button>
      </StatePanel>
    );
  }

  /*
   * Payable (pending, or failed after a rejected slip). A rejection has to say
   * why, or the student resubmits the same thing — only the newest one: older
   * attempts are history, not instructions.
   */
  const rejection = order.payments?.filter((payment) => payment.status === 'failed' && payment.review_remark).at(-1);

  return (
    <div className="space-y-4">
      {rejection ? (
        <div role="alert" className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-destructive">{t('payment.rejectedTitle')}</p>
            <p className="mt-0.5 text-sm text-foreground">{rejection.review_remark}</p>
          </div>
        </div>
      ) : null}

      <h2 className="text-lg font-semibold text-foreground">{t('site.checkout.methodTitle')}</h2>
      <BankTransferPanel order={order} />
    </div>
  );
}

const TONES = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  muted: 'bg-muted text-muted-foreground',
} as const;

function StatePanel({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
      <span className={cn('flex size-12 items-center justify-center rounded-full', TONES[tone])}>
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}
