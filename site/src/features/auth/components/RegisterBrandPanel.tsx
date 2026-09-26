import { useTranslation } from 'react-i18next';
import { BookOpen, Briefcase, Check, ListChecks, Plane, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Highlight } from '@/components/shared/Highlight';
import { cn } from '@/lib/utils';

const PERKS: { key: string; icon: LucideIcon }[] = [
  { key: 'register.perkCourses', icon: BookOpen },
  { key: 'register.perkChecklists', icon: ListChecks },
  { key: 'register.perkServices', icon: Briefcase },
];

const STEPS = ['register.stepDetails', 'register.stepVerify', 'register.stepStart'] as const;

/**
 * The navy half of the sign-up page: why join, and where you are in joining.
 *
 * On a phone it shrinks to a short band — the headline and the step tracker —
 * so the form starts above the fold; the flight path and the perks only appear
 * from `lg`, where there is a whole column to spare for them.
 *
 * Every decorative layer is `aria-hidden` and gold-on-navy only (7.5:1), the
 * same pairing as the header's current link.
 */
export function RegisterBrandPanel({ currentStep }: { currentStep: number }) {
  const { t } = useTranslation();

  return (
    <aside className="relative isolate overflow-hidden bg-surface p-5 text-surface-foreground sm:p-8 lg:p-10">
      {/* A faint dot grid and two soft glows: depth without a photo to depend on. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-20 [background-image:radial-gradient(var(--surface-muted)_1px,transparent_1px)] [background-size:18px_18px]"
      />
      <div aria-hidden="true" className="absolute -right-28 -bottom-28 -z-10 size-80 rounded-full bg-accent/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -top-24 -left-24 -z-10 size-72 rounded-full bg-primary-tint blur-2xl" />

      <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-accent uppercase">
        <Sparkles className="size-3.5" aria-hidden="true" />
        {t('register.eyebrow')}
      </p>

      <p className="mt-4 text-2xl leading-tight font-bold text-white sm:text-3xl">
        <Highlight text={t('register.panelHeading')} />
      </p>
      <p className="mt-2 hidden text-sm leading-6 text-surface-muted sm:block">{t('register.panelBody')}</p>

      <FlightPath className="mt-8 hidden lg:block" />

      <ul className="mt-8 hidden space-y-3 lg:block">
        {PERKS.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-center gap-3 text-sm text-surface-foreground">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-accent">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            {t(key)}
          </li>
        ))}
      </ul>

      <Stepper className="mt-6 lg:mt-10" current={currentStep} />
    </aside>
  );
}

/**
 * Sri Lanka to the UAE, drawn as one dashed arc — the whole business of the
 * company in a single line. The plane sits on the arc's apex, where the
 * quadratic's tangent is horizontal, so it is rotated to fly level.
 */
function FlightPath({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={className} aria-hidden="true">
      <div className="relative">
        <svg viewBox="0 0 320 110" className="h-auto w-full overflow-visible">
          <path
            d="M24 88 Q160 -8 296 88"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2 8"
            opacity="0.85"
          />
          {[24, 296].map((x) => (
            <g key={x}>
              <circle cx={x} cy={88} r={11} fill="var(--accent)" opacity="0.18" />
              <circle cx={x} cy={88} r={5} fill="#ffffff" />
            </g>
          ))}
        </svg>

        {/* The apex of the arc is y = 40 of 110 — 36.4% down the drawing. */}
        <span className="absolute top-[36.4%] left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground ring-4 ring-surface">
          <Plane className="size-4 rotate-45" />
        </span>
      </div>

      <div className="mt-1 flex justify-between text-xs font-semibold tracking-wide text-surface-muted uppercase">
        <span>{t('register.journeyFrom')}</span>
        <span>{t('register.journeyTo')}</span>
      </div>
    </div>
  );
}

function Stepper({ current, className }: { current: number; className?: string }) {
  const { t } = useTranslation();

  return (
    <ol className={cn('flex items-start', className)} aria-label={t('register.stepOf', { current: current + 1, total: STEPS.length })}>
      {STEPS.map((key, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <li key={key} className="flex flex-1 flex-col items-center gap-2 text-center" aria-current={active ? 'step' : undefined}>
            <div className="flex w-full items-center">
              {/* The connector into this step; the first step has none, but keeps the width. */}
              <span className={cn('h-0.5 flex-1', index === 0 ? 'bg-transparent' : done || active ? 'bg-accent' : 'bg-surface-border')} />
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors duration-300',
                  done && 'border-accent bg-accent text-accent-foreground',
                  active && 'border-accent bg-surface text-accent ring-4 ring-accent/20',
                  !done && !active && 'border-surface-border text-surface-muted',
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn('h-0.5 flex-1', index === STEPS.length - 1 ? 'bg-transparent' : done ? 'bg-accent' : 'bg-surface-border')} />
            </div>
            <span className={cn('text-[11px] leading-4 font-medium sm:text-xs', active ? 'text-white' : 'text-surface-muted')}>
              {t(key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
