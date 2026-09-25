import { Fragment, type ReactNode } from 'react';

/**
 * `**double asterisks**` mark the word a website heading draws in gold.
 *
 * **This is not Markdown and it is never rendered as HTML.** The string is
 * split on the marker and the odd segments are wrapped in a `<span>`; there is
 * no parser and no `dangerouslySetInnerHTML`, so a heading containing `<script>`
 * is just text with angle brackets in it. `site/src/components/shared/
 * Highlight.tsx` does the same thing on the public side — the two are one
 * decision in two apps, and neither may be "upgraded" to a Markdown renderer
 * without the other.
 */

/**
 * The marked segments of a heading, for a preview. Odd indices are highlighted.
 *
 * Keyed by position, which is correct here rather than a compromise: the list is
 * derived whole from one string on every keystroke, so a segment has no identity
 * that outlives the render it was produced in.
 */
export function renderHighlight(value: string, className: string): ReactNode {
  return value.split('**').map((segment, index) =>
    index % 2 === 1 ? (
      <span key={`h${index}`} className={className}>
        {segment}
      </span>
    ) : (
      <Fragment key={`p${index}`}>{segment}</Fragment>
    ),
  );
}

/**
 * The heading with its markers removed, for list cards and breadcrumbs — places
 * that want one line of plain text rather than styled output.
 */
export function plainHeading(value: string | null): string {
  return (value ?? '').split('**').join('');
}
