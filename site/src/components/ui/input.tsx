import * as React from 'react';
import { cn } from '@/lib/utils';

/*
 * Taller and larger-typed than `web/`'s input, on purpose.
 *
 *  - `h-10` rather than `h-8`: root CLAUDE.md requires 44px tap targets on
 *    mobile, and this app is used on phones. The admin's 32px rows are a
 *    desktop dense-table trade-off that does not belong here.
 *  - `text-base` under `sm`: **iOS Safari zooms the whole page in when a focused
 *    input's font is under 16px.** That zoom is what makes a mobile sign-in form
 *    feel broken — the page jumps and never quite comes back. `sm:text-sm`
 *    restores the smaller type from tablet up, where no zoom happens.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          'flex h-10 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors sm:text-sm',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:border-ring/45',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'aria-invalid:border-destructive',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
