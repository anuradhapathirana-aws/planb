import { SERVICE_ICONS, type ServiceIconName } from '@shared/types/service';
import { cn } from '@/lib/utils';
import { SERVICE_ICON_GLYPHS } from '@/features/admin/services/serviceIcons';

export interface ServiceIconPickerProps {
  value: ServiceIconName | null;
  onChange: (value: ServiceIconName | null) => void;
  disabled?: boolean;
}

/**
 * Pick the glyph a service shows on the app's Home grid.
 *
 * **A visible grid, not a `Select`.** The admin is choosing a picture, and a
 * dropdown of two dozen words would make them read a list to imagine one. Every
 * option is on screen at its real size, which is also how you notice you have
 * already used the passport icon on another service.
 *
 * Clicking the selected icon again clears it, which is the only way back to "not
 * chosen" — and that state is meaningfully different from picking *Other*: the
 * app draws the same fallback glyph for both, but a null says nobody decided,
 * which is what makes "which services still need an icon?" answerable later.
 */
export function ServiceIconPicker({ value, onChange, disabled }: ServiceIconPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Service icon"
      className="grid grid-cols-6 gap-1.5 sm:grid-cols-8"
    >
      {SERVICE_ICONS.map((option) => {
        const Glyph = SERVICE_ICON_GLYPHS[option.value];
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            /*
             * The label is the only thing naming this control — the glyph is a
             * picture and the `title` tooltip never reaches a screen reader.
             */
            aria-label={option.label}
            title={option.label}
            disabled={disabled}
            onClick={() => onChange(selected ? null : option.value)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-md border transition-colors',
              'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
              'disabled:pointer-events-none disabled:opacity-50',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            <Glyph className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
