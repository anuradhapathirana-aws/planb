<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\StudentCourseSummaryResource;
use App\Models\CourseProgramme;
use App\Models\Student;
use App\Services\Course\CourseWishlistService;
use App\Services\Course\StudentCourseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The student's wishlist of saved courses.
 *
 * No Form Requests: neither write takes a body — the course is the route
 * parameter and the student is the authenticated user, so there is no input to
 * validate. The course arrives through the published-only `course` binding in
 * routes/api_student.php, which is the authorization for which courses may be
 * saved; the list is scoped to the authenticated student inside the services.
 */
class WishlistController extends Controller
{
    public function __construct(
        private readonly CourseWishlistService $wishlist,
        private readonly StudentCourseService $courses,
    ) {}

    /** Saved courses, newest save first, as the same rows the course list returns. */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => StudentCourseSummaryResource::collection(
                $this->courses->wishlist($this->student($request)),
            ),
        ]);
    }

    public function store(Request $request, CourseProgramme $course): JsonResponse
    {
        $this->wishlist->add($this->student($request), $course);

        return $this->state($course, true);
    }

    public function destroy(Request $request, CourseProgramme $course): JsonResponse
    {
        $this->wishlist->remove($this->student($request), $course);

        return $this->state($course, false);
    }

    /**
     * The state after the write, so the app can settle its optimistic heart on
     * the server's answer rather than on its own guess.
     */
    private function state(CourseProgramme $course, bool $wishlisted): JsonResponse
    {
        return response()->json([
            'data' => [
                'course_id' => $course->id,
                'is_wishlisted' => $wishlisted,
            ],
        ]);
    }

    private function student(Request $request): Student
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return $student;
    }
}
