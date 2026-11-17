import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, ChevronLeft, Info, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { CoinMark } from '@/features/portal/components/CoinMark';
import { useExchangeRate } from '@/features/portal/queries';
import { paths } from '@/routes/paths';
import { useGoBack } from '@/lib/useGoBack';
import { convertAmount } from '@shared/lib/currencyConversion';
import { formatDate } from '@shared/lib/formatters';

/**
 * The AED/LKR converter — the mobile app's `tools/currency` screen.
 *
 * Plan B prices everything in LKR while every number a student meets about the
 * UAE (salary, visa fee, rent) is quoted in AED. This closes that gap and does
 * nothing else: **display only**. It reads a rate and multiplies; nothing here
 * prices a course, opens an order or sends an amount anywhere. The arithmetic is
 * `@shared/lib/currencyConversion`, the same code the app runs.
 *
 * One field owns the input and the other is derived, rather than two edited
 * fields kept in step — that is how a cursor jumps mid-typing and rounding
 * errors pile up as the value bounces between them. The swap flips direction.
 *
 * Same query key as Home's rate card, so arriving from it costs no request.
 * Phone-first; on a laptop it stays one narrow column, which is all it needs.
 */
export function CurrencyConverterPage() {
  const { t } = useTranslation();
  const amountId = useId();

  const rate = useExchangeRate();
  const [amount, setAmount] = useState('1');
  const [inverted, setInverted] = useState(false);

  const data = rate.data ?? null;
  const from = inverted ? data?.quote : data?.base;
  const to = inverted ? data?.base : data?.quote;

  const converted = useMemo(
    () => (data === null ? '' : convertAmount(amount, data.rate, inverted)),
    [amount, inverted, data],
  );

  const goBack = useGoBack(paths.app.home);

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <header className="flex items-center gap-1">
        <button
          type="button"
          onClick={goBack}
          aria-label={t('common.back')}
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>
        <h1 className="truncate text-[22px] font-semibold leading-8 text-primary">{t('currency.title')}</h1>
      </header>

      {rate.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-[104px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
        </div>
      ) : data === null ? (
        // A failed request and the server's own `null` look the same to a
        // student, and "try again" is the only action for either.
        <EmptyState
          icon={WifiOff}
          title={t('currency.unavailableTitle')}
          body={t('currency.unavailableBody')}
          className="bg-card"
          action={
            <Button variant="outline" size="sm" onClick={() => void rate.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : (
        <>
          {/* The Home rate card, opened: navy with the gold coin. */}
          <section className="overflow-hidden rounded-xl bg-linear-to-br from-primary-tint to-surface">
            <div className="flex items-center gap-3.5 p-4">
              <CoinMark code={data.base} className="size-[52px] text-[12px]" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-surface-muted">
                  {t('currency.todaysRate')}
                </p>
                <p className="mt-1 truncate text-[22px] font-bold leading-8 text-white">
                  {t('currency.rateLine', { base: data.base, quote: data.quote, rate: data.rate.toFixed(4) })}
                </p>
              </div>
            </div>

            {/* Never undated: this is a mid-market figure, not a bank's rate. */}
            <div className="h-px bg-accent/40" />
            <p className="px-4 py-2.5 text-[11px] leading-4 text-surface-muted">
              {data.is_stale
                ? t('currency.stale', { date: formatDate(data.fetched_at) })
                : t('currency.indicative', { date: formatDate(data.fetched_at) })}
            </p>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-4">
            <div className="space-y-1.5">
              <Label htmlFor={amountId}>{t('currency.amountIn', { currency: from })}</Label>
              <Input
                id={amountId}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                placeholder={t('currency.amountPlaceholder')}
                // 16px on a phone: anything smaller makes iOS zoom the page on focus.
                className="h-12 text-[16px]"
              />
            </div>

            {/* The swap sits on a rule, so the two fields read as one exchange. */}
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <button
                type="button"
                onClick={() => setInverted((current) => !current)}
                aria-label={t('currency.swap', { from: to, to: from })}
                className="flex size-11 items-center justify-center rounded-full bg-primary text-accent outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-80"
              >
                <ArrowLeftRight className="size-[18px]" aria-hidden="true" />
              </button>
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* An output, not a second input: anything typed here would be overwritten. */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">{t('currency.amountIn', { currency: to })}</p>
              <output
                htmlFor={amountId}
                aria-live="polite"
                className="flex min-h-[52px] items-center truncate rounded-lg border border-accent/35 bg-accent-soft px-3 py-2 text-[22px] font-bold leading-8 text-primary"
              >
                {converted === '' ? '—' : converted}
              </output>
            </div>
          </section>

          {/* Not boilerplate: a bank takes a few percent on top, and a student
              budgeting a visa fee off this number needs to know that. */}
          <section className="flex gap-2.5 rounded-xl border bg-card p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-[12px] leading-[18px] text-muted-foreground">{t('currency.disclaimer')}</p>
          </section>
        </>
      )}
    </div>
  );
}
