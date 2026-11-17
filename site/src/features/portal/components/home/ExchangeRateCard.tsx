import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';

import { CoinMark } from '@/features/portal/components/CoinMark';
import { NAVY_GRADIENT } from '@/features/portal/components/home/homeLayout';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import { formatDate } from '@shared/lib/formatters';
import type { StudentExchangeRate } from '@shared/types/exchangeRate';

/**
 * The AED/LKR rate on the phone Home, after the app's `ExchangeRateCard`: one
 * untitled navy row under the carousel that opens the converter.
 *
 * **Never the figure alone** — an undated rate reads as today's bank rate, and
 * this is a mid-market number, so it always says "indicative" and when it was
 * taken. **Renders nothing without a rate**: `null` is a normal answer, and an
 * empty slot or an error on Home would both be worse than no row.
 */
export function ExchangeRateCard({ rate }: { rate: StudentExchangeRate | null | undefined }) {
  const { t } = useTranslation();

  if (rate === null || rate === undefined) return null;

  const date = formatDate(rate.fetched_at);
  const headline = t('currency.rateLine', { base: rate.base, quote: rate.quote, rate: rate.rate.toFixed(2) });

  return (
    <Link
      to={paths.app.currency}
      aria-label={`${headline}. ${t('currency.openConverter')}`}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-surface-border p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-90',
        NAVY_GRADIENT,
      )}
    >
      <CoinMark code={rate.base} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold leading-[21px] text-primary-foreground">{headline}</span>
        <span className="mt-0.5 block truncate text-[10px] leading-4 text-surface-foreground">
          {rate.is_stale ? t('currency.stale', { date }) : t('currency.indicative', { date })}
        </span>
      </span>

      {/* A white wash, not navy: a navy disc would vanish on the navy card. */}
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
        <ChevronRight className="size-[15px] text-primary-foreground" aria-hidden="true" />
      </span>
    </Link>
  );
}
