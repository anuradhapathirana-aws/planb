<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\DeleteStudentAccountRequest;
use App\Models\Student;
use App\Services\Student\StudentAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** A student deleting their own account. See StudentAccountService. */
class AccountController extends Controller
{
    public function __construct(private readonly StudentAccountService $accounts) {}

    public function requestDeletionCode(Request $request): JsonResponse
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return response()->json([
            'data' => $this->accounts->requestDeletionCode($student, $request->ip()),
        ]);
    }

    public function destroy(DeleteStudentAccountRequest $request): Response
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        $this->accounts->delete($student, $request->validated('code'));

        return response()->noContent();
    }
}
