import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { ChevronDown, ListChecks } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import type { StudentChecklistItem } from '@shared/types/studentChecklist';
import { colors } from '@shared/theme/tokens';
import { formatDate } from '@shared/lib/formatters';
import { countSteps, RichText } from '@/components/shared/RichText';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { useReduceMotion } from '@/lib/useReduceMotion';

export interface ChecklistItemCardProps {
  item: StudentChecklistItem;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleCompleted: (isCompleted: boolean) => void;
}

/**
 * One step in an arrival checklist.
 *
 * Two independent controls in one row, which is the whole design problem here:
 * the checkbox commits, the rest of the row reads. They are kept apart so a
 * student skimming the instructions never ticks something off by accident, and
 * so a student who already knows the step can tick it without opening anything.
 *
 * The steps stay *inline* rather than opening a sheet, so the box is still on
 * screen while they read — read a step, tick it, in one motion.
 */
export function ChecklistItemCard({
  item,
  expanded,
  onToggleExpanded,
  onToggleCompleted,
}: ChecklistItemCardProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();

  // Parsing the description twice per render would be wasteful on a long list;
  // the count is cheap to keep and tells the student there is guidance here.
  const steps = useMemo(() => countSteps(item.description), [item.description]);

  const hasDescription = (item.description ?? '').trim() !== '';
  const done = item.is_completed;

  const meta = done
    ? t('checklist.doneOn', { date: formatDate(item.completed_at) })
    : steps > 0
      ? t('checklist.steps', { count: steps })
      : hasDescription
        ? t('checklist.readSteps')
        : null;

  /*
   * With no steps to read there is nothing to expand, so the row becomes a
   * second, bigger tap target for the checkbox rather than a dead press.
   */
  const onRowPress = hasDescription ? onToggleExpanded : () => onToggleCompleted(!done);

  return (
    <Animated.View
      layout={reduceMotion ? undefined : LinearTransition.duration(200)}
      className={cn(
        'flex-row overflow-hidden rounded-xl border border-border',
        done ? 'bg-muted' : 'bg-card',
      )}
    >
      {/* The rail is the at-a-glance state: gold means outstanding, green done.
          It reads down the list as progress without any text to scan. */}
      <View className={cn('w-1', done ? 'bg-success' : 'bg-accent')} />

      <View className="flex-1">
        <View className="flex-row items-start gap-1 py-2 pl-1 pr-2">
          <Checkbox
            checked={done}
            onChange={onToggleCompleted}
            accessibilityLabel={
              done
                ? `${t('checklist.markNotDone')}: ${item.title}`
                : `${t('checklist.markDone')}: ${item.title}`
            }
          />

          <Pressable
            accessibilityRole={hasDescription ? 'button' : 'checkbox'}
            accessibilityState={hasDescription ? { expanded } : { checked: done }}
            accessibilityLabel={item.title}
            accessibilityHint={hasDescription ? t('checklist.readSteps') : t('checklist.markDone')}
            onPress={onRowPress}
            className="min-h-[44px] flex-1 justify-center py-1.5"
          >
            <Text
              className={cn(
                'text-[15px] font-medium leading-[22px]',
                done ? 'text-muted-foreground line-through' : 'text-foreground',
              )}
            >
              {item.title}
            </Text>

            {meta !== null && (
              <Text className="mt-0.5 text-[12px] leading-[18px] text-muted-foreground">{meta}</Text>
            )}
          </Pressable>

          {hasDescription && (
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
              <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
                <ChevronDown size={18} color={colors['muted-foreground']} />
              </View>
            </Pressable>
          )}
        </View>

        {expanded && hasDescription && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(160)}
            exiting={reduceMotion ? undefined : FadeOut.duration(120)}
            className="border-t border-border px-4 pb-4 pt-3.5"
          >
            <View className="mb-2.5 flex-row items-center gap-1.5">
              <ListChecks size={13} color={colors['muted-foreground']} />
              <Text variant="label">{t('checklist.howTo')}</Text>
            </View>

            <RichText html={item.description} />

            {/*
              The checkbox is above the fold of a long description, so the
              action is repeated at the end — the student finishes reading the
              last step exactly where they need to tick it.
            */}
            <Button
              label={done ? t('checklist.markNotDone') : t('checklist.markDone')}
              variant={done ? 'outline' : 'secondary'}
              size="sm"
              fullWidth
              className="mt-4"
              onPress={() => onToggleCompleted(!done)}
            />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
