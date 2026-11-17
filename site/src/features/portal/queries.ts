import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { fetchChecklists } from '@/api/checklists.api';
import {
  fetchStudentCourse,
  fetchStudentCourseCategories,
  fetchStudentCourses,
} from '@/api/studentCourses.api';
import { fetchExchangeRate, fetchHomeBanners } from '@/api/studentHome.api';
import type { StudentCourseListFilters } from '@shared/types/studentCourse';

/*
 * The portal's shared queries. One key per endpoint, so the home page warms the
 * caches the Courses and Checklist pages read next instead of fetching a
 * second shape that could disagree with them — the mobile app's rule too.
 *
 * Everything sits under `student`, and `useSignOut` clears the whole cache, so
 * nothing fetched for one student is ever shown to the next person at the
 * same browser.
 */
export const portalKeys = {
  courses: ['student', 'courses'] as const,
  /** A filtered course list. Sits under `courses` so a wishlist write updates it too. */
  courseSearch: (filters: StudentCourseListFilters) => ['student', 'courses', filters] as const,
  course: (id: number | null) => ['student', 'course', id] as const,
  courseCategories: ['student', 'course-categories'] as const,
  checklists: ['student', 'checklists'] as const,
  homeBanners: ['student', 'home-banners'] as const,
  exchangeRate: ['student', 'exchange-rate'] as const,
};

/**
 * `enabled: false` lets a public page ask for this only when someone is signed
 * in — the catalogue uses it to mark a student's own courses, and a signed-out
 * visitor must not fire a request that can only 401.
 */
export function useStudentCourses({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: portalKeys.courses,
    queryFn: () => fetchStudentCourses(),
    select: (response) => response.data,
    enabled,
  });
}

/**
 * One course with the student's progress. Refetched on focus (the default), so
 * coming back from a lesson in another tab shows the new ticks and locks.
 * A 404 (unpublished or gone) is an answer, not something to retry.
 */
export function useStudentCourse(id: number | null) {
  return useQuery({
    queryKey: portalKeys.course(id),
    queryFn: () => fetchStudentCourse(id as number),
    enabled: id !== null,
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 404) && failureCount < 1,
  });
}

export function useChecklists() {
  return useQuery({ queryKey: portalKeys.checklists, queryFn: fetchChecklists });
}

/**
 * A server-side search of the catalogue. Disabled until there is something to
 * search for, so an idle search box costs no request.
 */
export function useCourseSearch(filters: StudentCourseListFilters, enabled: boolean) {
  return useQuery({
    queryKey: portalKeys.courseSearch(filters),
    queryFn: () => fetchStudentCourses(filters),
    select: (response) => response.data,
    enabled,
    staleTime: 60_000,
  });
}

/** Admins change categories rarely; the default caching is enough. */
export function useCourseCategories() {
  return useQuery({ queryKey: portalKeys.courseCategories, queryFn: fetchStudentCourseCategories });
}

/**
 * The server refreshes this a few times a day, so refetching on every Home
 * visit would be a request per visit for a number that has not moved.
 */
export function useExchangeRate() {
  return useQuery({
    queryKey: portalKeys.exchangeRate,
    queryFn: fetchExchangeRate,
    staleTime: 60 * 60 * 1000,
  });
}

export function useHomeBanners() {
  return useQuery({
    queryKey: portalKeys.homeBanners,
    queryFn: fetchHomeBanners,
    // Admin-edited a few times a month; refetching on every visit buys nothing.
    staleTime: 10 * 60 * 1000,
  });
}
