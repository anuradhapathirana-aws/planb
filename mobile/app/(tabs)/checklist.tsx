import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { ListChecks, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ChecklistPhase } from '@shared/types/checklist';
import { colors } from '@shared/theme/tokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { ChecklistItemSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { ChecklistItemCard } from '@/features/checklist/ChecklistItemCard';
import { PhaseProgressCard } from '@/features/checklist/PhaseProgressCard';
import { phaseLabel, useChecklists } from '@/features/checklist/useChecklists';

/**
 * The arrival checklists.
 *
 * Two phases, one at a time. Both come down in a single request, so switching
 * tabs is instant — the same reasoning as the Courses screen's All/Enrolled
 * split, and it matters more here because a student flips between "what's left
 * before I fly" and "what happens when I land" while planning.
 *
 * The title and the phase switch stay pinned; the progress card scrolls with
 * the list so the steps get the screen (root CLAUDE.md §17).
 */
export default function ChecklistScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { phases, isLoading, isError, refetch, toggle } = useChecklists();

  const [phase, setPhase] = useState<ChecklistPhase>('before_arrival');
  const [refreshing, setRefreshing] = useState(false);

  /*
   * One open item at a time. A checklist with every description unfolded is a
   * wall of text that hides the checkboxes, which are the point of the screen.
   */
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // A row left open in the other phase would silently reopen on return.
  useEffect(() => setExpandedId(null), [phase]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const active = useMemo(
    () => phases.find((candidate) => candidate.phase === phase),
    [phases, phase],
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <Header phase={phase} onChange={setPhase} />

        <View className="gap-3 px-5">
          <ChecklistItemSkeleton />
          <ChecklistItemSkeleton />
          <ChecklistItemSkeleton />
          <ChecklistItemSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Header phase={phase} onChange={setPhase} />

      <FlatList
        data={active?.items ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ChecklistItemCard
            item={item}
            expanded={expandedId === item.id}
            onToggleExpanded={() =>
              setExpandedId((current) => (current === item.id ? null : item.id))
            }
            onToggleCompleted={(isCompleted) => toggle(item.id, isCompleted)}
          />
        )}
        ListHeaderComponent={
          active === undefined || isError ? null : (
            <View className="pb-4">
              <PhaseProgressCard phase={active.phase} progress={active.progress} />
            </View>
          )
        }
        contentContainerClassName="px-5 gap-2.5"
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isError ? (
            <EmptyState
              icon={WifiOff}
              tone="danger"
              title={t('checklist.loadFailedTitle')}
              body={t('checklist.loadFailedBody')}
              actionLabel={t('common.retry')}
              onAction={() => void refetch()}
            />
          ) : (
            <EmptyState
              icon={ListChecks}
              title={t('checklist.emptyTitle')}
              body={t('checklist.emptyBody')}
            />
          )
        }
      />
    </View>
  );
}

interface HeaderProps {
  phase: ChecklistPhase;
  onChange: (phase: ChecklistPhase) => void;
}

function Header({ phase, onChange }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-3 px-5 pb-4 pt-4">
      <View>
        <Text variant="display">{t('checklist.title')}</Text>
        <Text variant="caption" className="mt-1">
          {t('checklist.subtitle')}
        </Text>
      </View>

      <SegmentedToggle<ChecklistPhase>
        value={phase}
        onChange={onChange}
        options={[
          { value: 'before_arrival', label: phaseLabel('before_arrival', t) },
          { value: 'after_arrival', label: phaseLabel('after_arrival', t) },
        ]}
      />
    </View>
  );
}
