import { useMemo } from 'react';
import type { CourseCategory } from '@shared/types/course';

export interface CategoryCascade {
  /** The main category currently selected, or null. */
  parentId: number | null;
  /** The sub-category currently selected, or null for "the main category itself". */
  subId: number | null;
  /** Sub-categories of the selected main category. */
  children: CourseCategory[];
  selectParent: (parentId: number | null) => void;
  selectSub: (subId: number | null) => void;
}

/**
 * Two linked dropdowns — Main category, then Sub-category — over ONE stored id.
 *
 * A course keeps a single `course_category_id` pointing at the most specific
 * category chosen, and the main category is derived from that row's parent. So
 * the pair can never disagree: picking a main category stores it, picking a
 * sub-category stores the sub-category, and "none" stores the main one again.
 */
export function useCategoryCascade(
  tree: CourseCategory[],
  value: number | null,
  onChange: (value: number | null) => void,
): CategoryCascade {
  const { parentId, subId, children } = useMemo(() => {
    if (value === null) return { parentId: null, subId: null, children: [] as CourseCategory[] };

    const parent = tree.find((category) => category.id === value);
    if (parent) return { parentId: parent.id, subId: null, children: parent.children ?? [] };

    for (const candidate of tree) {
      if (candidate.children?.some((child) => child.id === value)) {
        return { parentId: candidate.id, subId: value, children: candidate.children ?? [] };
      }
    }

    return { parentId: null, subId: null, children: [] as CourseCategory[] };
  }, [tree, value]);

  return {
    parentId,
    subId,
    children,
    selectParent: (next) => onChange(next),
    selectSub: (next) => onChange(next ?? parentId),
  };
}

/**
 * Adds the course's current category to a tree it is missing from — a category
 * can be deactivated after courses were filed under it, and dropping its option
 * would show the field as empty and quietly force a change on the next save.
 */
export function withCurrentCategory(tree: CourseCategory[], current: CourseCategory | undefined): CourseCategory[] {
  if (!current) return tree;

  const present = tree.some((parent) => parent.id === current.id || parent.children?.some((c) => c.id === current.id));
  if (present) return tree;

  if (current.parent_id === null) return [...tree, { ...current, children: [] }];

  const parentIndex = tree.findIndex((parent) => parent.id === current.parent_id);
  if (parentIndex >= 0) {
    return tree.map((parent, index) =>
      index === parentIndex ? { ...parent, children: [...(parent.children ?? []), current] } : parent,
    );
  }

  // Its main category is missing too; show a stand-in so both dropdowns can render.
  const stub: CourseCategory = {
    ...current,
    id: current.parent_id,
    parent_id: null,
    name: current.parent?.name ?? 'Inactive category',
    name_si: null,
    icon: null,
    icon_image_url: null,
    children: [current],
  };
  return [...tree, stub];
}
