import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  activateCourseCategory,
  createCourseCategory,
  deactivateCourseCategory,
  deleteCourseCategory,
  deleteCourseCategoryIcon,
  fetchCourseCategories,
  updateCourseCategory,
  uploadCourseCategoryIcon,
} from '@/api/courseCategories.api';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { PaginatedResponse } from '@shared/types/api';
import type { CourseCategory, CourseCategoryFormValues, CourseCategoryListFilters } from '@shared/types/course';

const courseCategoriesKey = (filters: CourseCategoryListFilters) => ['course-categories', filters] as const;

export function useCourseCategories(filters: CourseCategoryListFilters) {
  return useQuery({
    queryKey: courseCategoriesKey(filters),
    queryFn: () => fetchCourseCategories(filters),
    placeholderData: (previous) => previous,
  });
}

/**
 * Every category as a tree, active or not — for pickers that must be able to
 * show any category (the Courses list filter, the parent select).
 */
export function useCourseCategoryTree() {
  return useQuery({
    queryKey: ['course-categories', 'tree'],
    queryFn: () => fetchCourseCategories({ sort: 'sort_order', direction: 'asc', per_page: 100 }),
    select: (data) => data.data,
    staleTime: 60 * 1000,
  });
}

/**
 * Active categories only, as a tree — powers the Course form's pickers. A parent
 * that is switched off drops out with its whole branch, since nothing under it
 * reaches students.
 */
export function useActiveCourseCategories() {
  return useQuery({
    queryKey: ['course-categories', 'tree'],
    queryFn: () => fetchCourseCategories({ sort: 'sort_order', direction: 'asc', per_page: 100 }),
    select: selectActiveTree,
    staleTime: 60 * 1000,
  });
}

/*
 * Module-level so its identity is stable: TanStack Query then re-runs it only
 * when the data changes. An inline one rebuilt the tree on every render, which
 * re-rendered every dropdown option under the Course form's category pickers.
 */
function selectActiveTree(data: PaginatedResponse<CourseCategory>): CourseCategory[] {
  return data.data
    .filter((parent) => parent.is_active)
    .map((parent) => ({ ...parent, children: (parent.children ?? []).filter((child) => child.is_active) }));
}

function useInvalidateCourseCategories() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['course-categories'] });
  };
}

export function useCreateCourseCategory() {
  const invalidate = useInvalidateCourseCategories();

  return useMutation({
    mutationFn: (payload: CourseCategoryFormValues) => createCourseCategory(payload),
    onSuccess: (category) => {
      invalidate();
      toast.success(category.parent_id ? 'Sub-category added.' : 'Category added.');
    },
    // A 422 is shown under the offending field by the form, so toasting it too
    // would say the same thing twice.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not add category.');
    },
  });
}

export function useUpdateCourseCategory(id: number) {
  const invalidate = useInvalidateCourseCategories();

  return useMutation({
    mutationFn: (payload: CourseCategoryFormValues) => updateCourseCategory(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Category updated.');
    },
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not update category.');
    },
  });
}

export function useToggleCourseCategoryActive() {
  const invalidate = useInvalidateCourseCategories();

  return useMutation({
    mutationFn: ({ id, activate }: { id: number; activate: boolean }) =>
      activate ? activateCourseCategory(id) : deactivateCourseCategory(id),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(variables.activate ? 'Category activated.' : 'Category deactivated.');
    },
    onError: () => toast.error('Could not update category status.'),
  });
}

export function useDeleteCourseCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCourseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-categories'] });
      // Its courses were deleted with it.
      queryClient.invalidateQueries({ queryKey: ['course-programmes'] });
      toast.success('Category deleted.');
    },
    // The server's refusal ("3 students are enrolled…") is the useful message,
    // so it is shown as-is rather than replaced by a generic one.
    onError: (error) => {
      const reason = Object.values(getValidationErrors(error) ?? {})[0]?.[0];
      toast.error(reason ?? 'Could not delete category.');
    },
  });
}

export function useUploadCourseCategoryIcon(id: number) {
  const invalidate = useInvalidateCourseCategories();

  return useMutation({
    mutationFn: (file: File) => uploadCourseCategoryIcon(id, file),
    onSuccess: () => {
      invalidate();
      toast.success('Icon uploaded.');
    },
    onError: (error) => {
      const reason = Object.values(getValidationErrors(error) ?? {})[0]?.[0];
      toast.error(reason ?? 'Could not upload the icon.');
    },
  });
}

export function useDeleteCourseCategoryIcon(id: number) {
  const invalidate = useInvalidateCourseCategories();

  return useMutation({
    mutationFn: () => deleteCourseCategoryIcon(id),
    onSuccess: () => {
      invalidate();
      toast.success('Icon removed.');
    },
    onError: () => toast.error('Could not remove the icon.'),
  });
}
