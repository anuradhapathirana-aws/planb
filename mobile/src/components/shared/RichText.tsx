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
}

/** How many steps this description describes — for a "3 steps" badge. */
export function countSteps(html: string | null | undefined): number {
  if (!html) return 0;

  return countListItems(parseHtml(html));
}

const MONOSPACE = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

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
          <Text key={key} className="font-semibold text-foreground">
            {renderInline(node.children, key)}
          </Text>
        );

      case 'em':
      case 'i':
        return (
          <Text key={key} className="italic">
            {renderInline(node.children, key)}
          </Text>
        );

      case 'u':
        return (
          <Text key={key} className="underline">
            {renderInline(node.children, key)}
          </Text>
        );

      case 's':
        return (
          <Text key={key} className="line-through">
            {renderInline(node.children, key)}
          </Text>
        );

      case 'code':
        return (
          <Text key={key} style={{ fontFamily: MONOSPACE }} className="text-[13px] text-foreground">
            {renderInline(node.children, key)}
          </Text>
        );

      case 'a':
        return node.href === undefined ? (
          <Fragment key={key}>{renderInline(node.children, key)}</Fragment>
        ) : (
          <Text
            key={key}
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
function splitChildren(nodes: HtmlNode[]): { inline: HtmlNode[]; blocks: HtmlElementNode[] } {
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

const HEADING_CLASS: Record<string, string> = {
  h2: 'text-[16px] font-semibold leading-6 text-foreground',
  h3: 'text-[15px] font-semibold leading-6 text-foreground',
  h4: 'text-[14px] font-semibold leading-5 text-foreground',
};

interface ListItemProps {
  node: HtmlElementNode;
  /** The step number for an ordered list; undefined renders a bullet instead. */
  index?: number;
  keyPrefix: string;
}

/**
 * One step.
 *
 * An ordered list gets a numbered gold chip, which is the whole reason steps
 * are worth authoring as a list: the student can see at a glance that this is
 * "do 1, then 2, then 3" and not a paragraph they have to parse. Gold on its
 * own tint is also the one safe way to use the accent behind text (tokens.ts).
 */
function ListItem({ node, index, keyPrefix }: ListItemProps) {
  const { inline, blocks } = splitChildren(node.children);

  return (
    <View className="flex-row gap-2.5">
      {index === undefined ? (
        <View className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
      ) : (
        <View className="mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-full bg-accent-soft">
          <Text className="text-[11px] font-bold leading-4 text-accent-foreground">{index}</Text>
        </View>
      )}

      <View className="flex-1 gap-2">
        {inline.length > 0 && (
          <Text className="text-[14px] leading-[22px] text-muted-foreground">
            {renderInline(inline, `${keyPrefix}-t`)}
          </Text>
        )}

        {blocks.map((block, blockIndex) => (
          <Fragment key={`${keyPrefix}-b-${blockIndex}`}>
            {renderBlock(block, `${keyPrefix}-b-${blockIndex}`)}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function renderBlock(node: HtmlNode, key: string): ReactNode {
  if (node.kind === 'text') {
    if (node.text.trim() === '') return null;

    return (
      <Text key={key} className="text-[14px] leading-[22px] text-muted-foreground">
        {node.text}
      </Text>
    );
  }

  switch (node.tag) {
    case 'h2':
    case 'h3':
    case 'h4':
      return (
        <Text key={key} className={HEADING_CLASS[node.tag]}>
          {renderInline(node.children, key)}
        </Text>
      );

    case 'ul':
    case 'ol': {
      const items = node.children.filter(
        (child): child is HtmlElementNode => child.kind === 'element' && child.tag === 'li',
      );

      return (
        <View key={key} className="gap-2.5">
          {items.map((item, index) => (
            <ListItem
              key={`${key}-${index}`}
              node={item}
              index={node.tag === 'ol' ? index + 1 : undefined}
              keyPrefix={`${key}-${index}`}
            />
          ))}
        </View>
      );
    }

    case 'blockquote':
      return (
        <View key={key} className="border-l-2 border-accent pl-3">
          <Text className="text-[14px] italic leading-[22px] text-muted-foreground">
            {renderInline(node.children, key)}
          </Text>
        </View>
      );

    case 'pre':
      return (
        <View key={key} className="rounded-md bg-muted px-3 py-2">
          <Text
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
        <Text key={key} className="text-[14px] leading-[22px] text-muted-foreground">
          {renderInline([node], key)}
        </Text>
      );
  }
}

export function RichText({ html, className }: RichTextProps) {
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
      <Text key={`run-${at}`} className="text-[14px] leading-[22px] text-muted-foreground">
        {renderInline(run, `run-${at}`)}
      </Text>,
    );
  };

  nodes.forEach((node, index) => {
    if (node.kind === 'element' && isBlockTag(node.tag)) {
      flush(index);
      blocks.push(<Fragment key={`block-${index}`}>{renderBlock(node, `block-${index}`)}</Fragment>);

      return;
    }

    pending.push(node);
  });

  flush(nodes.length);

  return <View className={cn('gap-2.5', className)}>{blocks}</View>;
}
