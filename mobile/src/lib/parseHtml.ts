/**
 * A tiny HTML parser for admin-authored rich text.
 *
 * React Native has no DOM, so the sanitized HTML the backend stores (checklist
 * steps, topic descriptions) has to become a tree of native views. This turns
 * it into one, and `components/shared/RichText.tsx` renders it.
 *
 * Deliberately hand-rolled rather than `react-native-render-html` (root
 * CLAUDE.md §12.3 — a new dependency needs a reason the stack can't cover).
 * The reason it can: `App\Support\HtmlSanitizer` has ALREADY reduced every
 * stored description to the seventeen tags in ALLOWED_TAGS below, on write. A
 * general-purpose renderer would carry a hundred tags we forbid, ~200KB, and a
 * third party sitting between admin content and students.
 *
 * That said, this parser assumes nothing about the input beyond "it is a
 * string": unknown tags are unwrapped, unclosed tags are closed at the end,
 * and stray closing tags are ignored. A description written before the
 * sanitizer existed, or one hand-edited in the database, degrades to its text
 * rather than to a crash.
 */

export interface HtmlTextNode {
  kind: 'text';
  text: string;
}

export interface HtmlElementNode {
  kind: 'element';
  tag: AllowedTag;
  /** Only ever set on `a`, and only when the scheme is one we will open. */
  href?: string;
  children: HtmlNode[];
}

export type HtmlNode = HtmlTextNode | HtmlElementNode;

/**
 * Mirrors `HtmlSanitizer::ALLOWED_TAGS`. Keep the two in step — a tag the
 * editor can produce and this list can't name renders as plain text, which is
 * a silent downgrade rather than a visible bug.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
  'a', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
] as const;

export type AllowedTag = (typeof ALLOWED_TAGS)[number];

/** Tags with no closing partner, so they never open a scope. */
const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

/** Blocks break the line; everything else flows inside a paragraph. */
const BLOCK_TAGS = new Set<AllowedTag>(['p', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'pre']);

/**
 * Mirrors `HtmlSanitizer::ALLOWED_SCHEMES`. Checked again here rather than
 * trusted: this parser also runs over content that predates the sanitizer.
 */
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

export function isBlockTag(tag: AllowedTag): boolean {
  return BLOCK_TAGS.has(tag);
}

const TAG_PATTERN = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)\/?>/g;

const HREF_PATTERN = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  middot: '·',
};

/** `String.fromCodePoint` throws on anything outside the Unicode range. */
function fromCodePoint(code: number): string | null {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return null;

  return String.fromCodePoint(code);
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return fromCodePoint(Number.parseInt(entity.slice(2), 16)) ?? match;
    }

    if (entity.startsWith('#')) {
      return fromCodePoint(Number.parseInt(entity.slice(1), 10)) ?? match;
    }

    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * HTML collapses runs of whitespace, including the newlines and indentation an
 * editor leaves between tags. Without this every list item arrives with a
 * leading space and paragraphs are separated by blank text nodes.
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function extractHref(attributes: string): string | undefined {
  const match = HREF_PATTERN.exec(attributes);

  if (!match) return undefined;

  const href = (match[1] ?? match[2] ?? match[3] ?? '').trim();

  if (href === '') return undefined;

  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*:)/.exec(href)?.[1]?.toLowerCase();

  // A relative link stays inside the platform and is safe; anything with a
  // scheme has to be one we are willing to hand to the OS.
  if (scheme !== undefined && !ALLOWED_SCHEMES.includes(scheme)) return undefined;

  return href;
}

function isAllowedTag(tag: string): tag is AllowedTag {
  return (ALLOWED_TAGS as readonly string[]).includes(tag);
}

/**
 * A node in the tree while it is still being built. `tag` is null for the root
 * and for an unknown element, which is what makes unwrapping free: children of
 * an unknown tag are simply spliced into its parent when it closes.
 */
interface OpenNode {
  tag: AllowedTag | null;
  href?: string;
  children: HtmlNode[];
}

export function parseHtml(html: string): HtmlNode[] {
  const root: OpenNode = { tag: null, children: [] };
  const stack: OpenNode[] = [root];

  const current = (): OpenNode => stack[stack.length - 1] ?? root;

  const pushText = (raw: string): void => {
    const text = decodeEntities(normalizeWhitespace(raw));

    if (text === '') return;

    const parent = current();
    const last = parent.children[parent.children.length - 1];

    // Adjacent text nodes happen whenever an unknown tag was unwrapped between
    // them. Merging keeps `<span>a</span>b` as one run rather than two.
    if (last?.kind === 'text') {
      last.text += text;

      return;
    }

    parent.children.push({ kind: 'text', text });
  };

  const closeNode = (): void => {
    const node = stack.pop();

    if (node === undefined || stack.length === 0) {
      // Never pop the root — a stray `</p>` must not orphan everything after it.
      if (node !== undefined) stack.push(node);

      return;
    }

    const parent = current();

    if (node.tag === null) {
      parent.children.push(...node.children);

      return;
    }

    parent.children.push({ kind: 'element', tag: node.tag, href: node.href, children: node.children });
  };

  let cursor = 0;
  let match: RegExpExecArray | null;

  TAG_PATTERN.lastIndex = 0;

  while ((match = TAG_PATTERN.exec(html)) !== null) {
    pushText(html.slice(cursor, match.index));
    cursor = TAG_PATTERN.lastIndex;

    const [, slash, rawTag = '', attributes = ''] = match;
    const tag = rawTag.toLowerCase();
    const closing = slash === '/';

    if (VOID_TAGS.has(tag)) {
      if (!closing && tag === 'br') {
        current().children.push({ kind: 'element', tag: 'br', children: [] });
      }

      continue;
    }

    if (!closing) {
      const allowed = isAllowedTag(tag);

      stack.push({
        tag: allowed ? tag : null,
        href: allowed && tag === 'a' ? extractHref(attributes) : undefined,
        children: [],
      });

      continue;
    }

    /*
     * Close back to the matching open tag. Malformed nesting (`<b><i></b></i>`)
     * would otherwise strand every later node inside a scope that never closes,
     * and the rest of the description would vanish.
     */
    const wanted = isAllowedTag(tag) ? tag : null;

    let openIndex = -1;
    for (let index = stack.length - 1; index > 0; index -= 1) {
      if (stack[index]?.tag === wanted) {
        openIndex = index;
        break;
      }
    }

    if (openIndex <= 0) continue;

    while (stack.length > openIndex) closeNode();
  }

  pushText(html.slice(cursor));

  // Anything the author left unclosed closes here rather than being dropped.
  while (stack.length > 1) closeNode();

  return root.children;
}

/**
 * How many `<li>` a description contains, at any depth.
 *
 * Powers the "3 steps" badge on a collapsed checklist row — the student can see
 * there is guidance behind the chevron without opening every item to find out.
 */
export function countListItems(nodes: HtmlNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.kind !== 'element') return total;

    return total + (node.tag === 'li' ? 1 : 0) + countListItems(node.children);
  }, 0);
}

/** True when the tree holds nothing but whitespace — an "empty" description. */
export function isBlank(nodes: HtmlNode[]): boolean {
  return nodes.every((node) => {
    if (node.kind === 'text') return node.text.trim() === '';

    return node.tag !== 'br' && isBlank(node.children);
  });
}
