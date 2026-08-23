import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmented control for a binary/small (2–3 option) choice — a dark brand track
 * with the selected option lifted out as a light pill. Used instead of a `Select`
 * when there are only a couple of options.
 * See CLAUDE.md §8 "Sectioned Admin Forms" (established on Student Visa status).
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  invalid,
  className,
}: {
  options: readonly SegmentedOption<T>[];
  /** Undefined until the user picks — no segment is highlighted in that state. */
  value: T | undefined;
  onChange: (value: T) => void;
  /** Names the group for screen readers, since the visible label sits outside it. */
  label: string;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex h-8 w-full items-center gap-0.5 rounded-full bg-primary p-0.5',
        invalid && 'ring-2 ring-destructive/40',
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              'flex h-7 flex-1 items-center justify-center rounded-full px-3 text-[13px] font-semibold',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70',
              selected
                ? 'bg-background text-primary shadow-sm'
                : 'text-primary-foreground/70 hover:text-primary-foreground',
            )}
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
