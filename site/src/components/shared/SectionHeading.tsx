import type { ReactNode } from 'react';
import { Highlight } from '@/components/shared/Highlight';
import { cn } from '@/lib/utils';

/**
 * The heading block every marketing section shares: an optional eyebrow chip, a
 * title whose `**marked**` word goes gold, a short lead paragraph, and an
 * optional action pinned to the right on wide screens.
 *
 * One component rather than one per section, so a new section cannot invent a
 * fourth heading size and knock the page's rhythm out.
 */
export function SectionHeading({
  eyebrow,
  title,
  body,
  action,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        // The action sits beside the text on desktop and underneath on mobile,
        // where a right-aligned link next to a wrapped title reads as debris.
        !centered && action && 'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-2xl', centered && 'mx-auto text-center')}>
        {eyebrow ? (
          <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-strong">
            {eyebrow}
          </span>
        ) : null}

        <h2 className={cn('text-2xl font-bold tracking-tight text-primary sm:text-3xl', eyebrow && 'mt-3')}>
          <Highlight text={title} />
        </h2>

        {body ? <p className="mt-3 text-base leading-relaxed text-muted-foreground">{body}</p> : null}
      </div>

      {action ? <div className={cn('shrink-0', centered && 'mx-auto')}>{action}</div> : null}
    </div>
  );
}
