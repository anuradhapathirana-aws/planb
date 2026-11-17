import { useCallback, useMemo, useState } from 'react';

import { useCourseCategories } from '@/features/portal/queries';
import type { StudentCourseCategory } from '@shared/types/studentCourse';

export interface CategorySelection {
  parentId: number | null;
  subId: number | null;
}

const NONE: CategorySelection = { parentId: null, subId: null };

export interface CategoryFilterState {
  /** Main categories, each with its `children`, in the admin's order. */
  tree: StudentCourseCategory[];
  /** What is being picked in the open panel — not yet in effect. */
  draft: CategorySelection;
  draftParent: StudentCourseCategory | null;
  selectParent: (parentId: number | null) => void;
  selectSub: (subId: number | null) => void;
  /** The category the list is actually filtered by: the sub-category, else the main one. */
  appliedId: number | null;
  /** "Main › Sub" for the chip that shows what is applied. */
  appliedLabel: string | null;
  isDirty: boolean;
  apply: () => void;
  clear: () => void;
  /** Discard unapplied picks, so reopening the panel shows what is applied. */
  resetDraft: () => void;
}

/**
 * Two-level category filter — the app's `useCategoryFilter`. **Staged, not
 * live**: picking chips edits a draft and only "Apply" changes the list, so a
 * student tapping through categories does not fire a request per tap.
 * `initialParentId` lets a link open the page already filtered.
 */
export function useCategoryFilter(initialParentId: number | null = null): CategoryFilterState {
  const categories = useCourseCategories();
  const tree = useMemo(() => categories.data ?? [], [categories.data]);

  const [draft, setDraft] = useState<CategorySelection>({ parentId: initialParentId, subId: null });
  const [applied, setApplied] = useState<CategorySelection>({ parentId: initialParentId, subId: null });

  const draftParent = useMemo(() => tree.find((c) => c.id === draft.parentId) ?? null, [tree, draft.parentId]);

  const appliedLabel = useMemo(() => {
    const parent = tree.find((c) => c.id === applied.parentId);
    if (!parent) return null;

    const sub = parent.children?.find((child) => child.id === applied.subId);

    return sub ? `${parent.name} › ${sub.name}` : parent.name;
  }, [tree, applied]);

  const selectParent = useCallback((parentId: number | null) => setDraft({ parentId, subId: null }), []);
  const selectSub = useCallback((subId: number | null) => setDraft((current) => ({ ...current, subId })), []);
  const apply = useCallback(() => setApplied(draft), [draft]);
  const clear = useCallback(() => {
    setDraft(NONE);
    setApplied(NONE);
  }, []);
  const resetDraft = useCallback(() => setDraft(applied), [applied]);

  return {
    tree,
    draft,
    draftParent,
    selectParent,
    selectSub,
    appliedId: applied.subId ?? applied.parentId,
    appliedLabel,
    isDirty: draft.parentId !== applied.parentId || draft.subId !== applied.subId,
    apply,
    clear,
    resetDraft,
  };
}
