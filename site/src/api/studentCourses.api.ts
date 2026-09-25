import { apiClient, ensureCsrfCookie } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type { StudentAppConfig } from '@shared/types/companySettings';
import type { EnrolResult } from '@shared/types/studentOrder';
import type {
  StudentCategoryDetail,
  StudentCourseDetail,
  StudentCourseListFilters,
  StudentCourseSummary,
} from '@shared/types/studentCourse';

/**
 * The signed-in student's view of the course catalogue — the same
 * `GET /student/courses` the mobile app reads, carrying `is_enrolled` and
 * progress per course. Not the public catalogue (`publicCourses.api.ts`), which
 * a stranger may read and which therefore carries neither.
 *
 * `is_enrolled` and `is_locked` are presentation. The stream, progress and
 * paper endpoints 403 without an enrolment; that is the paywall.
 */

/**
 * The server's ceiling. Nothing in the portal paginates this list yet, and at
 * the server's default of 20 a larger catalogue would silently lose courses —
 * the mobile app learned that the hard way (see its `courses.api.ts`).
 */
const MAX_PER_PAGE = 50;

export async function fetchStudentCourses(
  filters: StudentCourseListFilters = {},
): Promise<PaginatedResponse<StudentCourseSummary>> {
  const { data } = await apiClient.get<PaginatedResponse<StudentCourseSummary>>('/student/courses', {
    params: { per_page: MAX_PER_PAGE, ...filters },
  });

  return data;
}

/**
 * The single way into a course. The client never decides whether a course
 * costs money: the server answers with an enrolment (free) or an order to pay
 * (paid), priced from the product on the server. No amount is ever sent.
 */
export async function enrolInCourse(courseId: number): Promise<EnrolResult> {
  await ensureCsrfCookie();

  const { data } = await apiClient.post<ApiResource<EnrolResult>>(`/student/courses/${courseId}/enrol`);

  return data.data;
}

/**
 * Public branding and switches, readable signed out. The website needs one
 * thing from it: `payments_enabled`, so a paid course shows "Coming soon ·
 * price" instead of a buy button the server would refuse (guide §6).
 */
export async function fetchAppConfig(): Promise<StudentAppConfig> {
  const { data } = await apiClient.get<ApiResource<StudentAppConfig>>('/student/app-config');

  return data.data;
}

/**
 * A bundle as THIS student sees it: which courses they own, and what the rest
 * would cost them — never charged twice for a course they have. Every figure
 * is the server's.
 */
export async function fetchStudentCategory(categoryId: number): Promise<StudentCategoryDetail> {
  const { data } = await apiClient.get<ApiResource<StudentCategoryDetail>>(
    `/student/course-categories/${categoryId}`,
  );

  return data.data;
}

/**
 * Buy the rest of a bundle. Same answer as enrolling: `enrolled` when nothing
 * was left to pay for, else `payment_required` with the order — priced from
 * the courses on the server, never from anything sent here.
 */
export async function purchaseBundle(categoryId: number): Promise<EnrolResult> {
  await ensureCsrfCookie();

  const { data } = await apiClient.post<ApiResource<EnrolResult>>(
    `/student/course-categories/${categoryId}/purchase`,
  );

  return data.data;
}

/**
 * One course as THIS student sees it: every topic and lesson with their own
 * progress and lock state, and the assessment summary. `is_locked` and
 * `is_enrolled` are presentation — the stream, progress and paper endpoints
 * refuse without an enrolment, whatever the page draws.
 */
export async function fetchStudentCourse(courseId: number): Promise<StudentCourseDetail> {
  const { data } = await apiClient.get<ApiResource<StudentCourseDetail>>(`/student/courses/${courseId}`);

  return data.data;
}
