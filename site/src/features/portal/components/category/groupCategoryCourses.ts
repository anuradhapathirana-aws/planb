import type { StudentCategoryDetail, StudentCourseSummary } from '@shared/types/studentCourse';

export interface CourseSection {
  key: string;
  /** Heading over the group; null when the page needs none (one flat list). */
  title: string | null;
  /** A sub-category sold as its own bundle — its page is where that bundle is bought. */
  ownBundleId: number | null;
  courses: StudentCourseSummary[];
}

/**
 * A category page's courses, grouped the way the app's Category screen groups
 * them: one flat list when there are no sub-categories; otherwise the courses
 * sitting directly on the category first, then one group per sub-category in
 * the admin's order. `subId` narrows it to one sub-category (the tabs). Courses
 * keep the server's order inside each group — that is the "Course 1, 2, 3" path.
 */
export function groupCategoryCourses(category: StudentCategoryDetail, subId: number | null): CourseSection[] {
  if (subId !== null) {
    const courses = category.courses.filter((course) => course.category_id === subId);
    const child = category.children.find((candidate) => candidate.id === subId);

    return courses.length > 0
      ? [
          {
            key: `sub-${subId}`,
            title: child?.own_bundle ? child.name : null,
            ownBundleId: child?.own_bundle ? subId : null,
            courses,
          },
        ]
      : [];
  }

  if (category.children.length === 0) {
    return category.courses.length > 0 ? [{ key: 'all', title: null, ownBundleId: null, courses: category.courses }] : [];
  }

  const sections: CourseSection[] = [];
  const direct = category.courses.filter((course) => course.category_id === category.id);
  if (direct.length > 0) sections.push({ key: 'direct', title: category.name, ownBundleId: null, courses: direct });

  for (const child of category.children) {
    const courses = category.courses.filter((course) => course.category_id === child.id);
    if (courses.length > 0) {
      sections.push({ key: `sub-${child.id}`, title: child.name, ownBundleId: child.own_bundle ? child.id : null, courses });
    }
  }

  return sections;
}
