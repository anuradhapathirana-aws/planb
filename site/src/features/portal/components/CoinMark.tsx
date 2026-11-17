import { cn } from '@/lib/utils';

/**
 * A gold coin stamped with a currency code — the app's `CoinMark`, used by the
 * Home rate card and the converter. Decorative: the text beside it always says
 * the same thing, so it is hidden from screen readers.
 */
export function CoinMark({ code, className }: { code: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold tracking-wide text-primary',
        'shadow-[inset_0_0_0_3px_color-mix(in_srgb,var(--accent-strong)_45%,transparent)]',
        className,
      )}
    >
      {code}
    </span>
  );
}
