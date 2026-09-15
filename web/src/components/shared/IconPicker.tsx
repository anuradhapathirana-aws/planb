import { Ban, type LucideIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface IconPickerOption<T extends string> {
  value: T;
  label: string;
}

export interface IconPickerProps<T extends string> {
  value: T | null;
  onChange: (value: T | null) => void;
  /** The icons on offer, in the order the list shows them. */
  options: ReadonlyArray<IconPickerOption<T>>;
  /** What each option draws. Exhaustive by type, so no option renders without a glyph. */
  glyphs: Record<T, LucideIcon>;
  /** Names the control for screen readers, e.g. "Service icon". */
  ariaLabel: string;
  /** The "leave it unset" option's wording. */
  noneLabel?: string;
  disabled?: boolean;
  id?: string;
}

/*
 * Radix Select reserves the empty string for "show the placeholder", so an explicit
 * "No icon" item needs a sentinel that can never collide with a real icon name.
 */
const NONE = '__none';

/**
 * Pick the glyph a record shows in the student app — a service card, a course
 * category tile.
 *
 * Every option draws its glyph beside the label, so the admin sees the picture they
 * are choosing rather than reading a list of words.
 *
 * The "no icon" option is kept distinct from any real choice, including *Other*: a
 * null says nobody decided, and each feature decides what the app draws then (a
 * generic glyph for services, a name-based guess for course categories).
 *
 * Shared by the Service form and the Course category form (root CLAUDE.md §4 —
 * a pattern used by more than one feature lives in `components/shared/`).
 */
export function IconPicker<T extends string>({
  value,
  onChange,
  options,
  glyphs,
  ariaLabel,
  noneLabel = 'No icon',
  disabled,
  id,
}: IconPickerProps<T>) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) => onChange(next === NONE ? null : (next as T))}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full" aria-label={ariaLabel}>
        <SelectValue placeholder="Select an icon" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>
          <span className="flex items-center gap-2 text-muted-foreground">
            <Ban className="size-4" />
            {noneLabel}
          </span>
        </SelectItem>
        <SelectSeparator />
        {options.map((option) => {
          // Annotated: indexing a `Record` over a generic key loses the component
          // type, and JSX then cannot tell `Glyph` accepts a `className`.
          const Glyph: LucideIcon = glyphs[option.value];

          return (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                <Glyph className="size-4 text-primary" />
                {option.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
