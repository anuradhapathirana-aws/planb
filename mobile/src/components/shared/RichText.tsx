import { Fragment, useMemo, type ReactNode } from 'react';
import { Linking, Platform, View } from 'react-native';

import { cn } from '@/lib/cn';
import {
  countListItems,
  isBlank,
  isBlockTag,
  parseHtml,
  type HtmlElementNode,
  type HtmlNode,
} from '@/lib/parseHtml';
import { Text } from '../ui/Text';

/**
 * Renders the admin's rich text as native views.
 *
 * This is what makes "steps to do this item" work: an ordered list authored in
 * the web panel comes out as numbered step rows, not a wall of prose. See
 * `lib/parseHtml.ts` for why there is no HTML-rendering dependency.
 *
 * Every text node still goes through our `Text`, so the Sinhala line-height
 * rules (mobile/CLAUDE.md §4) hold inside admin content too.
 */

export interface RichTextProps {
  html: string | null | undefined;
  /** Applied to the outer wrapper, for spacing at the call site. */
  className?: string;
  /**
   * `xs` sets body copy at 8px, justified, for dense detail screens (Service Details);
   * `sm` sets it at 12px, for copy nested inside an expanded row (a course topic);
   * `md`, the default, keeps the 14px the checklist reads at.
   */
  size?: RichTextSize;
}

type RichTextSize = 'md' | 'sm' | 'xs';

const BODY_CLASS: Record<RichTextSize, string> = {
  md: 'text-[14px] leading-[22px] text-muted-foreground',
  sm: 'text-[12px] leading-[20px] text-muted-foreground',
  xs: 'text-justify text-[8px] leading-[13px] text-muted-foreground',
};

/** How many steps this description describes — for a "3 steps" badge. */
export function countSteps(html: string | null | undefined): number {
  if (!html) return 0;

  return countListItems(parseHtml(html));
}

const MONOSPACE = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

function openLink(href: string): void {
  // The scheme is already restricted to http/https/mailto/tel by the parser;
  // this only guards against the OS having no handler for it.
  void Linking.canOpenURL(href).then((supported) => {
    if (supported) void Linking.openURL(href);
  });
}

/**
 * Inline runs. Returns raw children rather than a `<Text>` so callers can nest
 * them inside one — React Native only inherits text styling within a single
 * `Text` tree, so wrapping each run separately would break the flow.
 */
function renderInline(nodes: HtmlNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    if (node.kind === 'text') return <Fragment key={key}>{node.text}</Fragment>;

    switch (node.tag) {
      case 'br':
        return <Fragment key={key}>{'\n'}</Fragment>;

      case 'strong':
      case 'b':
        return (
          <Text key={key} variant="none" className="font-semibold text-foreground">
            {renderInline(node.children, key)}
          </Text>
        );

      case 'em':
      case 'i':
        return (
          <Text key={key} variant="none" className="italic">
            {renderInline(node.children, key)}
          </Text>
        );

      case 'u':
        return (
          <Text key={key} variant="none" className="underline">
            {renderInline(node.children, key)}
          </Text>
        );

      case 's':
        return (
          <Text key={key} variant="none" className="line-through">
            {renderInline(node.children, key)}
          </Text>
        );

      case 'code':
        return (
          <Text
            key={key}
            variant="none"
            style={{ fontFamily: MONOSPACE }}
            // No size of its own: it inherits the paragraph's, so code stays in
            // step with 8px and 14px copy alike.
            className="text-foreground"
          >
            {renderInline(node.children, key)}
          </Text>
        );

      case 'a':
        return node.href === undefined ? (
          <Fragment key={key}>{renderInline(node.children, key)}</Fragment>
        ) : (
          <Text
            key={key}
            variant="none"
            accessibilityRole="link"
            className="font-medium text-primary underline"
            onPress={() => openLink(node.href as string)}
          >
            {renderInline(node.children, key)}
          </Text>
        );

      default:
        // A block tag found inside a run of inline content — flatten it rather
        // than dropping the words.
        return <Fragment key={key}>{renderInline(node.children, key)}</Fragment>;
    }
  });
}

/**
 * Splits a node's children into the inline run that opens it and the block
 * elements that follow. A `<li>` holding a nested list is the case that needs
 * it: its own words have to render before the sub-list, inside their own Text.
 */
function splitChildren(nodes: HtmlNode[]): {
  inline: HtmlNode[];
  blocks: HtmlElementNode[];
} {
  const inline: HtmlNode[] = [];
  const blocks: HtmlElementNode[] = [];

  for (const node of nodes) {
    if (node.kind === 'element' && isBlockTag(node.tag) && node.tag !== 'li') {
      blocks.push(node);

      continue;
    }

    // Once a block has broken the line, later inline content belongs after it.
    if (blocks.length > 0 && node.kind === 'text' && node.text.trim() === '') continue;

    inline.push(node);
  }

  return { inline, blocks };
}

const HEADING_CLASS: Record<RichTextSize, Record<string, string>> = {
  md: {
    h2: 'text-[16px] font-semibold leading-6 text-foreground',
    h3: 'text-[15px] font-semibold leading-6 text-foreground',
    h4: 'text-[14px] font-semibold leading-5 text-foreground',
  },
  sm: {
    h2: 'text-[14px] font-semibold leading-[22px] text-foreground',
    h3: 'text-[13px] font-semibold leading-[21px] text-foreground',
    h4: 'text-[12px] font-semibold leading-5 text-foreground',
  },
  xs: {
    h2: 'text-[10px] font-semibold leading-4 text-foreground',
    h3: 'text-[9px] font-semibold leading-[15px] text-foreground',
    h4: 'text-[8px] font-semibold leading-[13px] text-foreground',
  },
};

interface ListItemProps {
  node: HtmlElementNode;
  /** The step number for an ordered list; undefined renders a bullet instead. */
  index?: number;
  keyPrefix: string;
  size: RichTextSize;
}

/**
 * One step.
 *
 * An ordered list gets a numbered gold chip, which is the whole reason steps
 * are worth authoring as a list: the student can see at a glance that this is
 * "do 1, then 2, then 3" and not a paragraph they have to parse. Gold on its
 * own tint is also the one safe way to use the accent behind text (tokens.ts).
 * At `xs` the number is plain text instead — see below.
 */
function ListItem({ node, index, keyPrefix, size }: ListItemProps) {
  const { inline, blocks } = splitChildren(node.children);

  const small = size === 'xs';

  return (
    // The marker and spacing shrink with the text: a 22px chip beside 8px copy
    // makes the list look no smaller than it was.
    <View className={cn('flex-row', small ? 'gap-1' : 'gap-2.5')}>
      {index === undefined ? (
        <View
          className={cn('rounded-full bg-accent', small ? 'mt-[5px] h-1 w-1' : 'mt-2 h-1.5 w-1.5')}
        />
      ) : small ? (
        /*
         * Plain "1." at the copy's own size and line height, so it sits on the
         * first line's baseline. A chip small enough for 8px copy had no room
         * for a two-digit number and never lined up with the text beside it.
         * A minimum width, never a fixed one: a 12px box was narrower than
         * Poppins draws "1.", so the dot wrapped onto a second line. The
         * minimum still keeps single-digit items in one column, `numberOfLines`
         * forbids the wrap outright, and `shrink-0` stops the text beside it
         * squeezing the number.
         */
        <Text
          variant="none"
          numberOfLines={1}
          className="min-w-[14px] shrink-0 text-right text-[8px] font-medium leading-[13px] text-foreground"
        >
          {index}.
        </Text>
      ) : (
        <View className="mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-full bg-accent-soft">
          <Text variant="none" className="text-[11px] font-bold leading-4 text-accent-foreground">
            {index}
          </Text>
        </View>
      )}

      <View className={cn('flex-1', small ? 'gap-1' : 'gap-2')}>
        {inline.length > 0 && (
          <Text variant="none" className={BODY_CLASS[size]}>
            {renderInline(inline, `${keyPrefix}-t`)}
          </Text>
        )}

        {blocks.map((block, blockIndex) => (
          <Fragment key={`${keyPrefix}-b-${blockIndex}`}>
            {renderBlock(block, `${keyPrefix}-b-${blockIndex}`, size)}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function renderBlock(node: HtmlNode, key: string, size: RichTextSize): ReactNode {
  if (node.kind === 'text') {
    if (node.text.trim() === '') return null;

    return (
      <Text key={key} variant="none" className={BODY_CLASS[size]}>
        {node.text}
      </Text>
    );
  }

  switch (node.tag) {
    case 'h2':
    case 'h3':
    case 'h4':
      return (
        <Text key={key} variant="none" className={HEADING_CLASS[size][node.tag]}>
          {renderInline(node.children, key)}
        </Text>
      );

    case 'ul':
    case 'ol': {
      const items = node.children.filter(
        (child): child is HtmlElementNode => child.kind === 'element' && child.tag === 'li',
      );

      return (
        <View key={key} className={size === 'xs' ? 'gap-1.5' : 'gap-2.5'}>
          {items.map((item, index) => (
            <ListItem
              key={`${key}-${index}`}
              node={item}
              index={node.tag === 'ol' ? index + 1 : undefined}
              keyPrefix={`${key}-${index}`}
              size={size}
            />
          ))}
        </View>
      );
    }

    case 'blockquote':
      return (
        <View key={key} className="border-l-2 border-accent pl-3">
          <Text variant="none" className={cn(BODY_CLASS[size], 'italic')}>
            {renderInline(node.children, key)}
          </Text>
        </View>
      );

    case 'pre':
      return (
        <View key={key} className="rounded-md bg-muted px-3 py-2">
          <Text
            variant="none"
            style={{ fontFamily: MONOSPACE }}
            className="text-[12px] leading-5 text-foreground"
          >
            {renderInline(node.children, key)}
          </Text>
        </View>
      );

    case 'br':
      return null;

    // `p`, a stray `li`, and every inline tag sitting on its own line.
    default:
      return (
        <Text key={key} variant="none" className={BODY_CLASS[size]}>
          {renderInline([node], key)}
        </Text>
      );
  }
}

export function RichText({ html, className, size = 'md' }: RichTextProps) {
  const nodes = useMemo(() => (html ? parseHtml(html) : []), [html]);

  if (nodes.length === 0 || isBlank(nodes)) return null;

  /*
   * Loose inline content at the top level (`Book your medical<br>Bring cash`)
   * is gathered into one paragraph, so it reads as prose rather than as one
   * paragraph per word.
   */
  const blocks: ReactNode[] = [];
  let pending: HtmlNode[] = [];

  const flush = (at: number): void => {
    if (pending.length === 0) return;

    const run = pending;
    pending = [];

    if (run.every((node) => node.kind === 'text' && node.text.trim() === '')) return;

    blocks.push(
      <Text key={`run-${at}`} variant="none" className={BODY_CLASS[size]}>
        {renderInline(run, `run-${at}`)}
      </Text>,
    );
  };

  nodes.forEach((node, index) => {
    if (node.kind === 'element' && isBlockTag(node.tag)) {
      flush(index);
      blocks.push(
        <Fragment key={`block-${index}`}>{renderBlock(node, `block-${index}`, size)}</Fragment>,
      );

      return;
    }

    pending.push(node);
  });

  flush(nodes.length);

  return <View className={cn(size === 'xs' ? 'gap-1.5' : 'gap-2.5', className)}>{blocks}</View>;
}
