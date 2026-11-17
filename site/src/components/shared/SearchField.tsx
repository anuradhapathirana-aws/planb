import { forwardRef, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * The rounded search box the student pages use — the app's `SearchField`: a
 * magnifier, the input, and a clear button once there is something to clear.
 * 16px text, because anything smaller makes iOS zoom the page on focus.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const { t } = useTranslation();

    return (
      <div className={cn('relative', className)}>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          enterKeyHint="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="h-11 w-full rounded-full border bg-card pr-10 pl-11 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden"
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onValueChange('')}
            aria-label={t('common.clearSearch')}
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  },
);
SearchField.displayName = 'SearchField';
