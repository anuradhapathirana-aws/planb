import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shown wherever data can legitimately be empty — root CLAUDE.md §8 requires one
 * everywhere, and on a public site it matters more than in the admin panel: an
 * empty grid with no explanation reads to a visitor as a broken page, not as
 * "nothing here yet".
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>

      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {body ? <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
