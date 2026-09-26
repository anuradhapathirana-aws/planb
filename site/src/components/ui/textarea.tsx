import * as React from 'react';
import { cn } from '@/lib/utils';

/*
 * Copied from `web/`, with the same `text-base` under `sm` as this app's
 * `Input`: iOS Safari zooms the page into any focused field under 16px.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          'flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors sm:text-sm',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:border-ring/45',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive',
          'field-sizing-content',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
