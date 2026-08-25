import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  activateCourseCategory,
  createCourseCategory,
  deactivateCourseCategory,
  fetchCourseCategories,
  updateCourseCategory,
} from '@/api/courseCategories.api';
import { getValidationErrors } from '@/lib/serverErrors';
import type { CourseCategoryFormValues, CourseCategoryListFilters } from '@/types/course';

const courseCategoriesKey = (filters: CourseCategoryListFilters) => ['course-categories', filters] as const;

export function useCourseCategories(filters: CourseCategoryListFilters) {
  return useQuery({
    queryKey: courseCategoriesKey(filters),
    queryFn: () => fetchCourseCategories(filters),
    placeholderData: (previous) => previous,
  });
}

/** Active categories only — powers the Course form's category select. */
export function useActiveCourseCategories() {
  return useQuery({
    queryKey: ['course-categories', 'active'],
    queryFn: () =>
      fetchCourseCategories({
        is_active: '1',
        sort: 'sort_order',
        direction: 'asc',
        per_page: 100,
      }),
    select: (data) => data.data,
    staleTime: 60 * 1000,
  });
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
    onSuccess: () => {
      invalidate();
      toast.success('Category added.');
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
