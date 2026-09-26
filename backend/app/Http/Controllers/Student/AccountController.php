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
use Illuminate\Support\Facades\Auth;

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

        /*
         * The service revokes every token, which ends the app's sign-in. A
         * website sign-in is a session instead, and only stops working today
         * because the provider skips deleted rows — it would come back if the
         * record were ever restored. End it here, the way WebSessionController
         * ::logout does. An app request carries no session, so this is skipped.
         */
        if ($request->hasSession()) {
            Auth::guard('student-web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->noContent();
    }
}
