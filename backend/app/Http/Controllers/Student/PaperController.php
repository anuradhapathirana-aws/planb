<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\SubmitPaperAttemptRequest;
use App\Http\Resources\Student\CoursePaperAttemptResource;
use App\Http\Resources\Student\StudentPaperDetailResource;
use App\Models\CoursePaperAttempt;
use App\Models\CourseProgramme;
use App\Models\Student;
use App\Services\Course\CoursePaperAttemptService;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaperController extends Controller
{
    public function __construct(
        private readonly CoursePaperAttemptService $attempts,
        private readonly EnrolmentService $enrolments,
    ) {}

    /**
     * The paper is part of the course, so it sits behind the same paywall as the
     * lessons. Enforced here rather than relied on from the UI (root §7.12).
     */
    private function assertEnrolled(Request $request, CourseProgramme $course): void
    {
        /** @var Student $student */
        $student = $request->user();

        abort_unless(
            $this->enrolments->isEnrolled($student, $course),
            403,
            'Enrol in this course to take its question paper.',
        );
    }

    /** The paper and its questions — with no answer key anywhere in the payload. */
    public function show(Request $request, CourseProgramme $course): JsonResponse
    {
        $student = $this->student($request);
        $this->assertEnrolled($request, $course);
        $paper = $course->paper;

        // Same convention as the admin endpoint: a programme with no paper is
        // `data: null`, not a 404 — "there is no assessment" is a normal state.
        if ($paper === null) {
            return response()->json(['data' => null]);
        }

        $paper->load('questions.options');
        $paper->setAttribute('attempt_state', $this->attempts->summaryFor($student, $paper, $course));

        return response()->json(['data' => new StudentPaperDetailResource($paper)]);
    }

    public function start(Request $request, CourseProgramme $course): JsonResponse
    {
        $this->assertEnrolled($request, $course);

        $attempt = $this->attempts->start($this->student($request), $course);

        return response()->json(['data' => new CoursePaperAttemptResource($attempt)]);
    }

    public function submit(
        SubmitPaperAttemptRequest $request,
        CoursePaperAttempt $attempt,
    ): JsonResponse {
        $this->authorize('submit', $attempt);

        $attempt = $this->attempts->submit($attempt, $request->validated('answers'));

        return $this->resultResponse($this->student($request), $attempt);
    }

    public function result(Request $request, CoursePaperAttempt $attempt): JsonResponse
    {
        $this->authorize('view', $attempt);

        return $this->resultResponse($this->student($request), $attempt);
    }

    private function resultResponse(Student $student, CoursePaperAttempt $attempt): JsonResponse
    {
        $reveal = $this->attempts->mayRevealAnswers($student, $attempt);

        // Only load the answer key when it is actually going to be shown.
        $attempt->load($reveal ? ['answers.question.options'] : ['answers']);

        return response()->json([
            'data' => new CoursePaperAttemptResource($attempt, $reveal),
        ]);
    }

    private function student(Request $request): Student
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return $student;
    }
}
