import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A 2–3 option choice as one navy track with the selected option lifted out —
 * the admin panel's `SegmentedToggle` (root CLAUDE.md §8), so the same choice
 * looks the same on both sides. Taller here (40px track) because this app is
 * used on phones.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  invalid,
  disabled,
  className,
}: {
  options: readonly SegmentedOption<T>[];
  /** Null until the user picks — no segment is highlighted in that state. */
  value: T | null;
  onChange: (value: T) => void;
  /** Names the group for screen readers, since the visible label sits outside it. */
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex h-11 w-full items-center gap-0.5 rounded-full bg-primary p-1',
        invalid && 'ring-2 ring-destructive/40',
        disabled && 'opacity-60',
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              'flex h-9 flex-1 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors',
              'focus-visible:ring-2 focus-visible:ring-background/70 focus-visible:outline-none',
              selected
                ? 'bg-background text-primary shadow-sm'
                : 'text-primary-foreground/75 hover:text-primary-foreground',
            )}
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
