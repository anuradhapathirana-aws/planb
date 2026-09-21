import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { StudentCourseCategory } from '@shared/types/studentCourse';
import { fetchCourseCategories } from '@/api/courses.api';

/** A picked category: a main one, and optionally one of its sub-categories. */
export interface CategorySelection {
  parentId: number | null;
  subId: number | null;
}

const NONE: CategorySelection = { parentId: null, subId: null };

export interface CategoryFilterState {
  /** Visible main categories, each with its sub-categories, in the admin's order. */
  tree: StudentCourseCategory[];
  isLoading: boolean;
  /** What the panel is showing — edited freely, sent nowhere until `apply()`. */
  draft: CategorySelection;
  /** The main category currently picked in the draft, with its sub-categories. */
  draftParent: StudentCourseCategory | null;
  selectParent: (parentId: number | null) => void;
  selectSub: (subId: number | null) => void;
  /** The id the course list is filtered by, or null for every category. */
  appliedId: number | null;
  /** "Migration › UAE", for the chip that shows what is applied. */
  appliedLabel: string | null;
  /** The draft differs from what is applied — Apply has something to do. */
  isDirty: boolean;
  apply: () => void;
  clear: () => void;
  /** Throws away unapplied edits, e.g. when the panel is reopened. */
  resetDraft: () => void;
}

/**
 * The course category filter: pick a main category, then (optionally) one of
 * its sub-categories, then Apply.
 *
 * **Staged, not live.** Tapping chips edits a draft; only `apply()` changes
 * `appliedId`, which is what the course query keys on. So choosing "Migration"
 * on the way to "UAE" never fires a request the student did not ask for — the
 * same staged pattern the admin filters use.
 *
 * **By id, never by name.** The list is filtered on the server with
 * `category_id`: a main category returns its own courses plus every
 * sub-category's, a sub-category just its own. A renamed category cannot break
 * it, and filtering no longer depends on how much of the catalogue the phone
 * happens to have downloaded.
 */
export function useCategoryFilter(initialParentId: number | null = null): CategoryFilterState {
  // The same key Home's category row uses, so opening a filter costs no request.
  const categories = useQuery({
    queryKey: ['student-course-categories'],
    queryFn: fetchCourseCategories,
  });
  const tree = useMemo(() => categories.data ?? [], [categories.data]);

  const initial: CategorySelection = { parentId: initialParentId, subId: null };
  const [draft, setDraft] = useState<CategorySelection>(initial);
  const [applied, setApplied] = useState<CategorySelection>(initial);

  const draftParent = useMemo(
    () => tree.find((category) => category.id === draft.parentId) ?? null,
    [tree, draft.parentId],
  );

  const appliedLabel = useMemo(() => {
    const parent = tree.find((category) => category.id === applied.parentId);
    if (!parent) return null;

    const sub = parent.children?.find((child) => child.id === applied.subId);
    return sub ? `${parent.name} › ${sub.name}` : parent.name;
  }, [tree, applied]);

  const selectParent = useCallback((parentId: number | null) => {
    // A different main category starts its sub-category over at "All".
    setDraft({ parentId, subId: null });
  }, []);

  const selectSub = useCallback((subId: number | null) => {
    setDraft((current) => ({ ...current, subId }));
  }, []);

  const apply = useCallback(() => setApplied(draft), [draft]);

  const clear = useCallback(() => {
    setDraft(NONE);
    setApplied(NONE);
  }, []);

  const resetDraft = useCallback(() => setDraft(applied), [applied]);

  return {
    tree,
    isLoading: categories.isLoading,
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
