<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\RecordVideoProgressRequest;
use App\Http\Resources\Student\StudentCourseDetailResource;
use App\Http\Resources\Student\StudentCourseSummaryResource;
use App\Http\Resources\Student\StudentVideoProgressResource;
use App\Models\CourseProgramme;
use App\Models\CourseVideo;
use App\Models\Student;
use App\Services\Course\CoursePaperAttemptService;
use App\Services\Course\CourseProgressService;
use App\Services\Course\CourseVideoService;
use App\Services\Course\StudentCourseService;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CourseController extends Controller
{
    public function __construct(
        private readonly StudentCourseService $courses,
        private readonly CourseProgressService $progress,
        private readonly CoursePaperAttemptService $attempts,
        private readonly EnrolmentService $enrolments,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $programmes = $this->courses->list($this->student($request), [
            'search' => $request->string('search')->toString(),
            'per_page' => $request->integer('per_page', 20),
        ]);

        return response()->json([
            'data' => StudentCourseSummaryResource::collection($programmes->items()),
            'meta' => [
                'current_page' => $programmes->currentPage(),
                'last_page' => $programmes->lastPage(),
                'per_page' => $programmes->perPage(),
                'total' => $programmes->total(),
            ],
        ]);
    }

    /**
     * The programme is resolved through a published-only route binding, so an
     * unpublished or soft-deleted one 404s before this runs. See
     * routes/api_student.php.
     */
    public function show(Request $request, CourseProgramme $course): JsonResponse
    {
        $student = $this->student($request);

        $course = $this->courses->detail($student, $course);

        if ($course->paper !== null) {
            $course->paper->setAttribute(
                'attempt_state',
                $this->attempts->summaryFor($student, $course->paper, $course),
            );
        }

        return response()->json(['data' => new StudentCourseDetailResource($course)]);
    }

    /**
     * A short-lived, student-scoped playback link plus the progress the player
     * seeds its clamp from. Re-calling this is also how the player refreshes a
     * link that expires mid-lesson.
     */
    public function stream(Request $request, CourseVideo $lesson, CourseVideoService $videos): JsonResponse
    {
        $student = $this->student($request);

        // Paywall first: whether a lesson even has a file is not something a
        // student who has not paid for the course is entitled to learn.
        $this->assertEnrolledInLessonCourse($student, $lesson);

        abort_unless($lesson->hasVideoFile(), Response::HTTP_NOT_FOUND);

        $playback = $this->courses->playback($student, $lesson, $videos);

        return response()->json([
            'data' => [
                'url' => $playback['url'],
                'expires_at' => $playback['expires_at'],
                'progress' => new StudentVideoProgressResource($playback['progress']),
            ],
        ]);
    }

    /**
     * Record a progress flush. What comes back is the SERVER's view, clamped —
     * the player re-seeds from it, so an over-reporting client snaps back.
     */
    public function recordProgress(
        RecordVideoProgressRequest $request,
        CourseVideo $lesson,
    ): JsonResponse {
        $student = $this->student($request);
        $this->assertEnrolledInLessonCourse($student, $lesson);

        $progress = $this->progress->recordVideoProgress(
            $student,
            $lesson,
            (int) $request->validated('position_seconds'),
            (int) $request->validated('watched_delta_seconds'),
        );

        return response()->json(['data' => new StudentVideoProgressResource($progress)]);
    }

    /**
     * The actual paywall.
     *
     * Hiding a locked lesson in the UI is presentation; this is enforcement. A
     * 403 here is what stops someone with a token from calling the stream
     * endpoint directly for a course they never paid for (root CLAUDE.md §7.12).
     */
    private function assertEnrolledInLessonCourse(Student $student, CourseVideo $lesson): void
    {
        $programme = $lesson->topic?->programme;

        abort_if($programme === null, Response::HTTP_NOT_FOUND);

        abort_unless(
            $this->enrolments->isEnrolled($student, $programme),
            Response::HTTP_FORBIDDEN,
            'Enrol in this course to open its lessons.',
        );
    }

    private function student(Request $request): Student
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return $student;
    }
}
