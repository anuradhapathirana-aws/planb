import DOMPurify from 'dompurify';

import { cn } from '@/lib/utils';

/*
 * The same tag set `App\Support\HtmlSanitizer` keeps on write. The server is
 * the enforcement point (root CLAUDE.md §7.6, `SEC-4`); this is the second
 * fence, so a stored value that somehow skipped the server's sanitiser still
 * cannot run script in a student's browser.
 */
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

/**
 * Admin-authored rich text (topic descriptions, assessment instructions).
 *
 * **The one place in this app allowed to use `dangerouslySetInnerHTML`, and
 * only with `DOMPurify.sanitize()` on the same line** (`SEC-6`). Anything else
 * that needs to show stored HTML renders this component rather than repeating
 * the pattern.
 */
export function RichText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn('pb-rich-text', className)}
      // eslint-disable-next-line react/no-danger -- sanitised on this line, with the server's own allowlist
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR }) }}
    />
  );
}
