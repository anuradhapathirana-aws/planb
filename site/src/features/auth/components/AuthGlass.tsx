import { forwardRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';

import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { GOOGLE_SIGN_IN_AVAILABLE } from '@/features/auth/googleIdentity';
import { cn } from '@/lib/utils';

/*
 * The app's photo-and-glass sign-in look (`mobile/src/features/auth/AuthBackdrop.tsx`),
 * in the pieces the sign-in dialog and the phone sign-up page both build from.
 * One copy, so the two screens cannot drift apart from each other or from the app.
 */

/** The app's sign-in photo (`mobile/assets/appLoginBG.jpg`), copied as-is. */
const PHOTO = '/images/auth/sign-in-bg.jpg';

/*
 * Navy shade over the photo, strongest where text sits: the title band at the
 * top and the form card at the bottom, nearly clear across the student's face.
 * The same stops as the app.
 */
const SHADE = [
  [0, 80],
  [20, 35],
  [38, 10],
  [60, 30],
  [100, 80],
] as const;

const SHADE_GRADIENT = `linear-gradient(to bottom, ${SHADE.map(
  ([at, opacity]) => `color-mix(in srgb, var(--primary) ${opacity}%, transparent) ${at}%`,
).join(', ')})`;

/** The photo and its shade, filling the nearest positioned ancestor. Decorative. */
export function AuthPhoto({ className }: { className?: string }) {
  return (
    <>
      <img
        src={PHOTO}
        alt=""
        aria-hidden="true"
        className={cn('absolute inset-0 size-full object-cover object-top', className)}
        decoding="async"
      />
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: SHADE_GRADIENT }} />
    </>
  );
}

/**
 * The see-through form card. A navy tint, not a backdrop blur, to match the
 * app — which skips blur because cheaper Android phones render it badly.
 */
export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-white/25 bg-primary/35 p-5', className)}>{children}</div>;
}

type GlassInputProps = Omit<ComponentProps<'input'>, 'placeholder'> & {
  id: string;
  icon: LucideIcon;
  /** The accessible name, and the placeholder unless `placeholder` is given. */
  label: string;
  placeholder?: string;
  /** Shown only while the field is focused, as on the app — but always read out. */
  hint?: string;
  error?: string;
  /**
   * A date input cannot show a placeholder, so while it is `empty` and not
   * focused the browser's own "mm/dd/yyyy" is hidden and `placeholder` is
   * drawn over it instead.
   */
  empty?: boolean;
};

/**
 * The app's `glass` input: white text on a single underline, no box. The label
 * is visually the placeholder, but stays the accessible name.
 *
 * `forwardRef` and passed-through `onFocus`/`onBlur`, because React Hook Form's
 * `register()` hands over a ref and its own blur handler.
 */
export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ id, icon: Icon, label, placeholder, hint, error, empty = false, className, onFocus, onBlur, type, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const isDate = type === 'date';
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    const coverDate = isDate && empty && !focused;

    return (
      <div className="w-full">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <div
          className={cn(
            'group relative flex min-h-[52px] w-full items-center gap-3 border-b transition-colors',
            error ? 'border-destructive' : 'border-white/40 focus-within:border-accent',
          )}
        >
          <Icon
            className={cn(
              'size-5 shrink-0',
              error ? 'text-destructive-soft' : 'text-primary-foreground group-focus-within:text-accent',
            )}
            aria-hidden="true"
          />
          <input
            ref={ref}
            id={id}
            type={type}
            placeholder={isDate ? undefined : (placeholder ?? label)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            className={cn(
              // 16px stops iOS Safari zooming the page in on focus.
              'min-w-0 flex-1 bg-transparent py-3 text-base leading-6 text-white caret-accent outline-none placeholder:text-surface-muted disabled:opacity-60',
              // Browser autofill paints its own pale box; keep the glass look instead.
              'autofill:[-webkit-text-fill-color:var(--primary-foreground)] autofill:[transition:background-color_9999s_ease-out_0s]',
              // A light calendar icon on the navy.
              isDate && '[color-scheme:dark]',
              coverDate && 'text-transparent',
              className,
            )}
            {...props}
          />
          {coverDate ? (
            <span aria-hidden="true" className="pointer-events-none absolute left-8 text-base text-surface-muted">
              {placeholder ?? label}
            </span>
          ) : null}
        </div>

        {error ? (
          <p id={`${id}-error`} className="mt-1 text-[12px] leading-5 font-medium text-destructive-soft" role="alert">
            {error}
          </p>
        ) : hint ? (
          // Kept in the page while hidden, so a screen reader still hears it.
          <p id={`${id}-hint`} className={cn('mt-1 text-[12px] leading-5 text-surface-muted', !focused && 'sr-only')}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
GlassInput.displayName = 'GlassInput';

/** "or continue with (G)" — Google as just its "G", as on the app (client request). */
export function GlassGoogleRow({
  onCredential,
  disabled,
}: {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  if (!GOOGLE_SIGN_IN_AVAILABLE) return null;

  return (
    <div className="mt-4 flex items-center gap-3">
      <span aria-hidden="true" className="h-px flex-1 bg-white/25" />
      <span className="text-[12px] leading-5 text-surface-foreground">{t('auth.orContinueWith')}</span>
      <GoogleSignInButton onCredential={onCredential} disabled={disabled} iconOnly />
      <span aria-hidden="true" className="h-px flex-1 bg-white/25" />
    </div>
  );
}
