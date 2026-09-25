import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A titled block on a portal page, with an optional "View all" link.
 *
 * Border only, no shadow: the portal sits between the marketing site and the
 * admin panel (docs/WEBSITE_AND_PORTAL_GUIDE.md §4), and a page of stacked
 * shadowed cards reads heavy on a phone.
 */
export function PortalSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: { label: string; to: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card p-4 sm:p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {action ? (
          <Link
            to={action.to}
            // min-h-11 keeps the tap target at 44px without making the row taller.
            className="-my-3 -mr-2 flex min-h-11 items-center gap-0.5 rounded-md px-2 text-sm font-medium text-primary hover:underline"
          >
            {action.label}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
