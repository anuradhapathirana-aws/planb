<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\GoogleSignInRequest;
use App\Http\Requests\Student\RequestLoginCodeRequest;
use App\Http\Requests\Student\VerifyLoginCodeRequest;
use App\Http\Resources\Student\StudentProfileResource;
use App\Models\Student;
use App\Services\Auth\StudentAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly StudentAuthService $auth) {}

    /**
     * Always 200, always the same body — see backend/CLAUDE.md §4. Whether an
     * email was actually sent is not the caller's business.
     */
    public function requestCode(RequestLoginCodeRequest $request): JsonResponse
    {
        $ticket = $this->auth->requestLoginCode($request->validated('email'), $request->ip());

        return response()->json(['data' => $ticket]);
    }

    public function verifyCode(VerifyLoginCodeRequest $request): JsonResponse
    {
        $session = $this->auth->verifyLoginCode(
            $request->validated('email'),
            $request->validated('code'),
            $request->validated('device_name'),
        );

        return $this->sessionResponse($session);
    }

    /**
     * Sign in with Google — and sign *up*, for a verified Google account with no
     * student record yet. The two are one endpoint because the client cannot
     * tell them apart in advance and should not have to; the response says which
     * happened via `is_new_student`.
     */
    public function google(GoogleSignInRequest $request): JsonResponse
    {
        $session = $this->auth->signInWithGoogle(
            $request->validated('id_token'),
            $request->validated('device_name'),
        );

        return $this->sessionResponse($session);
    }

    public function refresh(Request $request): JsonResponse
    {
        /** @var Student $student */
        $student = $request->user();

        return response()->json([
            'data' => $this->auth->rotateToken($student, $request->input('device_name')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var Student $student */
        $student = $request->user();

        $this->auth->signOut($student);

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var Student $student */
        $student = $request->user();

        return response()->json([
            'data' => new StudentProfileResource($student->loadMissing(['industry', 'profession'])),
        ]);
    }

    /**
     * @param  array{token: string, expires_at: ?string, student: Student, is_new_student: bool}  $session
     */
    private function sessionResponse(array $session): JsonResponse
    {
        return response()->json([
            'data' => [
                'token' => $session['token'],
                'expires_at' => $session['expires_at'],
                // Only ever true on the Google path, which is the only one that
                // can register anyone. See StudentAuthService's class docblock.
                'is_new_student' => $session['is_new_student'],
                'student' => new StudentProfileResource($session['student']),
            ],
        ]);
    }
}
