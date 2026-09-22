<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\Student;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/**
 * The student app's Category page: what is in a category and — when its main
 * category sells as a bundle — what this student still has to pay for it.
 *
 * Reads the courses through {@see StudentCourseService::list()} so the rows are
 * exactly the tiles the rest of the app draws — progress, lock and wishlist
 * state included — with no second copy of those rules.
 */
class StudentCategoryService
{
    /** A category is small; this is the course list's own ceiling. */
    private const MAX_COURSES = 50;

    public function __construct(
        private readonly StudentCourseService $courses,
        private readonly CourseBundleService $bundles,
        private readonly EnrolmentService $enrolments,
    ) {}

    /**
     * The category a student may see: visible, or one they own a course in (a
     * switched-off category must not lock a buyer out of its page).
     *
     * A raw id rather than a route-bound model on purpose — `Route::bind()` is
     * global, and a visibility filter bound to `category` would also hide
     * inactive categories from the admin routes (see routes/api_student.php).
     */
    public function findForStudent(Student $student, int $id): CourseCategory
    {
        $category = CourseCategory::query()->with(['parent', 'media'])->find($id);

        $ownsSomething = $category !== null && CourseProgramme::query()
            ->whereIn('course_category_id', $category->selfAndChildIds())
            ->whereIn('id', $this->enrolments->enrolledProgrammeIds($student))
            ->exists();

        if ($category === null || (! $category->isVisibleToStudents() && ! $ownsSomething)) {
            throw (new ModelNotFoundException)->setModel(CourseCategory::class, [$id]);
        }

        return $category;
    }

    /**
     * Everything the Category page renders, as attributes on the model for
     * `StudentCategoryDetailResource`.
     */
    public function detail(Student $student, CourseCategory $category): CourseCategory
    {
        $category->load([
            'children' => fn ($children) => $children->where('is_active', true)->with('media'),
        ]);

        /** @var Collection<int, CourseProgramme> $courses */
        $courses = collect($this->courses->list($student, [
            'category_id' => $category->id,
            'per_page' => self::MAX_COURSES,
        ])->items());

        $category->setAttribute('courses', $courses);
        $category->setAttribute('courses_count', $courses->count());
        $category->setAttribute('total_duration_seconds', (int) $courses->sum('total_duration_seconds'));
        $category->setAttribute('owned_count', $courses->filter(fn ($course) => $course->getAttribute('is_enrolled'))->count());

        /*
         * The bundle this page sells: the category's own, or — for a
         * sub-category that follows it — the main category's. Null when the
         * courses here are sold one by one. A sub-category with a bundle of its
         * own is bought on its own page; the main page links to it.
         */
        $bundle = $category->bundleOwner();
        $category->setAttribute('bundle_owner', $bundle);
        $category->setAttribute('bundle_quote', $bundle === null ? null : $this->bundles->quote($student, $bundle));

        return $category;
    }
}
