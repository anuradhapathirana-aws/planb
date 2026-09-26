import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, CreditCard, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Pay → We work on it → Delivered, before the student buys — the same three
 * stages the tracker shows afterwards. Saying it up front turns the wait for
 * hand-done work into an expectation rather than a worry.
 */
export function ServiceHowItWorks() {
  const { t } = useTranslation();

  const steps: { icon: LucideIcon; label: string }[] = [
    { icon: CreditCard, label: t('services.howPay') },
    { icon: Wrench, label: t('services.howWork') },
    { icon: BadgeCheck, label: t('services.howDone') },
  ];

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t('services.howItWorks')}
      </h2>

      <ol className="mt-3 flex items-start">
        {steps.map((step, index) => (
          <Fragment key={step.label}>
            {/* A hairline between markers, on their centre line. */}
            {index > 0 ? <li aria-hidden="true" className="mt-4 h-px flex-1 bg-border" /> : null}
            <li className="flex w-20 flex-col items-center gap-1.5 text-center">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <step.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium text-foreground">{step.label}</span>
            </li>
          </Fragment>
        ))}
      </ol>
    </section>
  );
}
