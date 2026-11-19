import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Check, ChevronDown, ListChecks, ListTodo } from '@/components/icons';
import { useTranslation } from 'react-i18next';

import type {
  StudentChecklistItem,
  StudentChecklistItemPoint,
} from '@shared/types/studentChecklist';
import { colors } from '@shared/theme/tokens';
import { formatDate } from '@shared/lib/formatters';
import { countSteps, RichText } from '@/components/shared/RichText';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { useReduceMotion } from '@/lib/useReduceMotion';
import type { ChecklistTick } from './useChecklists';

export interface ChecklistItemCardProps {
  item: StudentChecklistItem;
  expanded: boolean;
  onToggleExpanded: () => void;
  onTick: (tick: ChecklistTick) => void;
}

/**
 * One step in an arrival checklist — the twin of the portal's
 * `ChecklistItemRow` (site/).
 *
 * Two independent controls in one row, which is the whole design problem here:
 * the checkbox commits, the rest of the row reads. They are kept apart so a
 * student skimming the instructions never ticks something off by accident, and
 * so a student who already knows the step can tick it without opening anything.
 *
 * The steps stay *inline* rather than opening a sheet, so the box is still on
 * screen while they read — read a step, tick it, in one motion.
 *
 * A step with checking points is done when every point is ticked; its own
 * checkbox ticks (or clears) all of them at once — the server's rule, mirrored
 * optimistically in `useChecklists`.
 */
export function ChecklistItemCard({
  item,
  expanded,
  onToggleExpanded,
  onTick,
}: ChecklistItemCardProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();

  // Parsing the description twice per render would be wasteful on a long list;
  // the count is cheap to keep and tells the student there is guidance here.
  const steps = useMemo(() => countSteps(item.description), [item.description]);

  const hasDescription = (item.description ?? '').trim() !== '';
  const points = item.points;
  const pointsDone = points.filter((point) => point.is_completed).length;
  const expandable = hasDescription || points.length > 0;
  const done = item.is_completed;

  const toggleItem = (isCompleted: boolean) => onTick({ itemId: item.id, isCompleted });

  const meta = done
    ? t('checklist.doneOn', { date: formatDate(item.completed_at) })
    : points.length > 0
      ? t('checklist.pointsProgress', { completed: pointsDone, total: points.length })
      : steps > 0
        ? t('checklist.steps', { count: steps })
        : hasDescription
          ? t('checklist.readSteps')
          : null;

  /*
   * With nothing to read or tick through there is nothing to expand, so the row
   * becomes a second, bigger tap target for the checkbox rather than a dead press.
   */
  const onRowPress = expandable ? onToggleExpanded : () => toggleItem(!done);

  return (
    <Animated.View
      layout={reduceMotion ? undefined : LinearTransition.duration(200)}
      className={cn(
        'flex-row overflow-hidden rounded-xl border border-border',
        done ? 'bg-muted' : 'bg-card',
      )}
    >
      {/* The rail is the at-a-glance state: gold means outstanding, navy done.
          It reads down the list as progress without any text to scan. */}
      <View className={cn('w-1', done ? 'bg-primary' : 'bg-accent')} />

      <View className="flex-1">
        {/* The 44px checkbox and chevron targets set the row's floor, so the
            padding around them is kept to almost nothing. */}
        <View className="flex-row items-center py-0.5 pr-0.5">
          <Checkbox
            checked={done}
            onChange={toggleItem}
            accessibilityLabel={
              done
                ? `${t('checklist.markNotDone')}: ${item.title}`
                : `${t('checklist.markDone')}: ${item.title}`
            }
          />

          <Pressable
            accessibilityRole={expandable ? 'button' : 'checkbox'}
            accessibilityState={expandable ? { expanded } : { checked: done }}
            accessibilityLabel={item.title}
            accessibilityHint={expandable ? t('checklist.readSteps') : t('checklist.markDone')}
            onPress={onRowPress}
            className="min-h-[44px] flex-1 justify-center py-1"
          >
            <Text
              className={cn(
                'text-[13px] font-medium leading-5',
                done ? 'text-muted-foreground line-through' : 'text-foreground',
              )}
            >
              {item.title}
            </Text>

            {meta !== null && (
              <Text className="text-[11px] leading-4 text-muted-foreground">{meta}</Text>
            )}
          </Pressable>

          {expandable && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={t('checklist.howTo')}
              hitSlop={8}
              onPress={onToggleExpanded}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
            >
              {/* Rotating the chevron rather than swapping the icon keeps the
                  open/close relationship obvious. */}
              <View
                style={{
                  transform: [{ rotate: expanded ? '180deg' : '0deg' }],
                }}
              >
                <ChevronDown size={16} color={colors['muted-foreground']} />
              </View>
            </Pressable>
          )}
        </View>

        {expanded && expandable && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(160)}
            exiting={reduceMotion ? undefined : FadeOut.duration(120)}
            className="gap-3 border-t border-border px-3 pb-3 pt-2.5"
          >
            {hasDescription && (
              <View>
                <SectionLabel icon="howTo" label={t('checklist.howTo')} />
                <RichText html={item.description} />
              </View>
            )}

            {points.length > 0 ? (
              <View>
                <SectionLabel icon="points" label={t('checklist.pointsTitle')} />

                {/* Hairlines keep each point and its note reading as one unit. */}
                <View className="-mx-1">
                  {points.map((point, index) => (
                    <PointRow
                      key={point.id}
                      point={point}
                      first={index === 0}
                      onToggle={() =>
                        onTick({
                          itemId: item.id,
                          pointId: point.id,
                          isCompleted: !point.is_completed,
                        })
                      }
                    />
                  ))}
                </View>
              </View>
            ) : (
              /*
               * The checkbox is above the fold of a long description, so the
               * action is repeated at the end — the student finishes reading the
               * last step exactly where they need to tick it. A step with points
               * needs no repeat: the points themselves are the action.
               */
              <Button
                label={done ? t('checklist.markNotDone') : t('checklist.markDone')}
                variant={done ? 'outline' : 'secondary'}
                size="sm"
                fullWidth
                onPress={() => toggleItem(!done)}
              />
            )}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

/** "How to do this" / "Tick off each of these" — a label, styled apart from the content. */
function SectionLabel({ icon, label }: { icon: 'howTo' | 'points'; label: string }) {
  const Icon = icon === 'howTo' ? ListChecks : ListTodo;

  return (
    <View className="mb-1.5 flex-row items-center gap-1.5">
      <Icon size={13} color={colors['muted-foreground']} />
      <Text variant="label" className="text-[10px]">
        {label}
      </Text>
    </View>
  );
}

/** The visible tick for a point — smaller than a step's, since the whole row is the target. */
const POINT_CIRCLE = 20;

/**
 * One checking point: the title line is the checkbox, spanning the card's
 * width so it stays an easy 44px target. Its description sits below, outside
 * the touchable — it may hold links, and those must not tick the point.
 */
function PointRow({
  point,
  first,
  onToggle,
}: {
  point: StudentChecklistItemPoint;
  first: boolean;
  onToggle: () => void;
}) {
  const hasDescription = (point.description ?? '').trim() !== '';
  const done = point.is_completed;

  return (
    <View className={cn(!first && 'border-t border-border')}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={point.title}
        onPress={onToggle}
        className="min-h-[44px] flex-row items-center gap-2.5 rounded-md px-1 py-1.5 active:bg-muted"
      >
        <View
          style={{ width: POINT_CIRCLE, height: POINT_CIRCLE, borderRadius: POINT_CIRCLE / 2 }}
          className={cn(
            'items-center justify-center border-2',
            done ? 'border-primary bg-primary' : 'border-border bg-card',
          )}
        >
          {done && <Check size={12} color={colors['primary-foreground']} strokeWidth={3.5} />}
        </View>

        <Text
          className={cn(
            'flex-1 text-[13px] font-medium leading-5',
            done ? 'text-muted-foreground line-through' : 'text-foreground',
          )}
        >
          {point.title}
        </Text>
      </Pressable>

      {hasDescription && (
        // Indented to sit under the title: 4px padding + 20px tick + 10px gap.
        <RichText html={point.description} size="sm" className="-mt-1 pb-2 pl-[34px] pr-1" />
      )}
    </View>
  );
}
