<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\StudentOrderResource;
use App\Models\CourseProgramme;
use App\Models\Student;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Payment\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Starting point for getting access to a course.
 *
 * One endpoint handles both cases so the app does not have to decide: a free
 * course enrols immediately, a paid one opens an order to pay against. What the
 * student is charged is read from the course on the server — never from the
 * request (root CLAUDE.md §7.3).
 */
class EnrolmentController extends Controller
{
    public function __construct(
        private readonly EnrolmentService $enrolments,
        private readonly OrderService $orders,
    ) {}

    public function store(Request $request, CourseProgramme $course): JsonResponse
    {
        $student = $this->student($request);

        // Already bought it — say so plainly instead of opening a second order.
        if ($this->enrolments->isEnrolled($student, $course)) {
            return response()->json([
                'data' => ['status' => 'enrolled', 'order' => null],
            ]);
        }

        if ($free = $this->enrolments->grantIfFree($student, $course)) {
            return response()->json([
                'data' => ['status' => 'enrolled', 'order' => null, 'enrolled_at' => $free->enrolled_at?->toIso8601String()],
            ], 201);
        }

        $order = $this->orders->createFor($student, $course);

        return response()->json([
            'data' => [
                'status' => 'payment_required',
                'order' => new StudentOrderResource($order->load('payments')),
            ],
        ], 201);
    }

    private function student(Request $request): Student
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return $student;
    }
}
