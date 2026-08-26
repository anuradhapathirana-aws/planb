/**
 * Web's formatter surface. The platform-neutral ones live in `@shared/lib/formatters`
 * so `mobile/` gets identical output; this file re-exports them so the ~40 existing
 * `@/lib/formatters` imports keep working, and adds the one formatter that cannot be
 * shared because it needs the DOM.
 */
export * from '@shared/lib/formatters';

/**
 * Plain-text excerpt of admin-authored HTML, for collapsed cards and list rows.
 * Rendering the markup there would need `dangerouslySetInnerHTML` + DOMPurify
 * (CLAUDE.md §7.6) for no real benefit — a one-line preview wants text anyway.
 *
 * `DOMParser` neither executes scripts nor loads resources, so the untrusted
 * markup is never live in the document. That also makes this web-only: React
 * Native has no DOM, which is why it stayed behind when the rest moved to shared/.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
