import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FilterCardProps {
  /** Filter fields — typically a responsive grid of Search/Select controls. */
  children: ReactNode;
  onApply: () => void;
  onClear: () => void;
  /** Count of currently-applied (non-default) filters, shown as a badge on the toggle. */
  activeCount?: number;
  defaultOpen?: boolean;
  applyLabel?: string;
  className?: string;
}

/**
 * Standard admin list-page filter pattern (see CLAUDE.md §8 "Compact Admin
 * Data Tables"): collapsed by default, edits are staged and only take effect
 * on "Apply Filter" so the query doesn't refire on every keystroke/click.
 */
export function FilterCard({
  children,
  onApply,
  onClear,
  activeCount = 0,
  defaultOpen = false,
  applyLabel = 'Apply Filter',
  className,
}: FilterCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
      >
        <Filter className="size-3.5 text-muted-foreground" />
        Filters
        {activeCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
            {activeCount}
          </Badge>
        )}
        <ChevronDown className={cn('ml-auto size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t px-3 py-3 sm:flex-row sm:items-end sm:flex-wrap">
              {children}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onApply();
                  }}
                >
                  <Search className="size-3.5" /> {applyLabel}
                </Button>
                {activeCount > 0 && (
                  <Button type="button" size="sm" variant="outline" onClick={onClear}>
                    <X className="size-3.5" /> Clear
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Layout helper for a single field inside a FilterCard's field grid. */
export function FilterField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-40 flex-1 flex-col gap-1.5', className)}>
      <label className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</label>
      {children}
    </div>
  );
}
