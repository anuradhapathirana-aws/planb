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
 *
 * **The home page's vertical rhythm, tightened at the client's request
 * (2026-09-25).** A new section should match it rather than pick its own:
 *
 * | Where | Value |
 * |---|---|
 * | Section wrapper | `py-12 sm:py-14` |
 * | Hero (taller by design) | `py-10 sm:py-14 lg:py-16` |
 * | Two-column grid gap | `gap-8 lg:gap-10` |
 * | Heading → content below | `mt-8` |
 * | Inside this block | `gap-3`, title `mt-2.5`, body `mt-2` |
 *
 * The title's marked word is `--accent` (#f19f00) — see `Highlight`, which owns
 * that decision and records why it overrides the contrast rule. The eyebrow chip
 * below stays on `--accent-strong`: it is 12px uppercase, which is where the
 * bright gold is least readable.
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
        'flex flex-col gap-3',
        /*
         * The action sits beside the text on desktop and underneath on mobile,
         * where a right-aligned control next to a wrapped title reads as debris.
         *
         * `items-start`, so the action lines up with the TITLE (client
         * instruction, 2026-09-25) rather than with the bottom of the lead
         * paragraph, which is where `items-end` left it — visibly adrift from
         * the heading it belongs to. Note that this aligns to the top of the
         * text block: give a section with an eyebrow chip its own offset if it
         * ever needs one, rather than changing this for everybody.
         */
        !centered && action && 'sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-2xl', centered && 'mx-auto text-center')}>
        {eyebrow ? (
          <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-strong">
            {eyebrow}
          </span>
        ) : null}

        <h2 className={cn('text-2xl font-bold tracking-tight text-primary sm:text-3xl', eyebrow && 'mt-2.5')}>
          <Highlight text={title} />
        </h2>

        {body ? <p className="mt-2 text-base leading-relaxed text-muted-foreground">{body}</p> : null}
      </div>

      {/*
        Rendered without a wrapper unless it needs centring. A wrapper is a flex
        child whether or not anything came out of it, so `gap-3` would reserve
        space under the paragraph for an action that decided to render nothing —
        `CarouselArrows` does exactly that on a strip that fits in one page.
        The trade: a left/right action supplies its own `shrink-0`.
      */}
      {action ? (centered ? <div className="mx-auto shrink-0">{action}</div> : action) : null}
    </div>
  );
}
