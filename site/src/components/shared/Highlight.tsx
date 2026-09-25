import { Fragment } from 'react';
import { cn } from '@/lib/utils';

/**
 * Renders a heading where the admin has marked part of it for emphasis:
 *
 *   "Study and work in the **UAE**"  →  Study and work in the <gold>UAE</gold>
 *
 * **Why markers rather than two separate fields.** The obvious design is a
 * `heading` plus a `heading_accent` column that the layout concatenates. That
 * breaks the moment the page is translated: Sinhala does not put the emphasised
 * word in the same position as English, and a fixed "plain then accent" order
 * would force a translator to write an ungrammatical sentence. A marker travels
 * *inside* the string, so `heading_si` can put the emphasis wherever Sinhala
 * actually wants it — or leave it out entirely.
 *
 * **This is not Markdown and must never become Markdown.** It splits plain text
 * on a delimiter and hands React an array of strings, so every segment is
 * escaped by React exactly as any other text would be. There is no
 * `dangerouslySetInnerHTML` here and no sanitiser needed (root CLAUDE.md §7.6).
 * An unclosed `**` simply renders literally rather than swallowing the rest of
 * the line.
 *
 * **The gold is `--accent` (#f19f00), the brand value at full brightness** —
 * the client's instruction, 2026-09-26, given after being shown the measurement:
 * on white it is 2.17:1, under the 3:1 WCAG AA asks even of large text. It
 * applies to marked words in headings only, which are 24px bold and up. The
 * small uppercase labels — section eyebrows, the course card's category — stay
 * on `--accent-strong`, where the same colour would be least readable and
 * nobody asked for it.
 */
export function Highlight({ text, className }: { text: string; className?: string }) {
  // Capturing group, so the delimited parts survive the split at odd indexes.
  const parts = text.split(/\*\*(.+?)\*\*/g);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className={cn('text-accent', className)}>
            {part}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
