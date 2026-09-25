<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\GoogleSignInRequest;
use App\Http\Requests\Student\VerifyLoginCodeRequest;
use App\Http\Resources\Student\StudentProfileResource;
use App\Models\Student;
use App\Services\Auth\StudentAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * The student's cookie session on the public website (site/).
 *
 * The same checks as the mobile sign-in — `StudentAuthService` is shared — but
 * the result is an httpOnly session cookie on the `student-web` guard instead of
 * a bearer token. No token is minted and none is returned: a token in a browser
 * would have to live in JavaScript, which is what root CLAUDE.md §13.12 forbids.
 * See docs/WEBSITE_AND_PORTAL_GUIDE.md §2.3.
 *
 * The token endpoints in AuthController stay exactly as they are; mobile still
 * needs them.
 */
class WebSessionController extends Controller
{
    public function __construct(private readonly StudentAuthService $auth) {}

    public function verifyCode(VerifyLoginCodeRequest $request): JsonResponse
    {
        $this->assertStateful($request);

        $result = $this->auth->authenticateWithCode(
            $request->validated('email'),
            $request->validated('code'),
        );

        return $this->startSession($request, $result['student'], $result['is_new_student']);
    }

    public function google(GoogleSignInRequest $request): JsonResponse
    {
        $this->assertStateful($request);

        $result = $this->auth->authenticateWithGoogle($request->validated('id_token'));

        return $this->startSession($request, $result['student'], $result['is_new_student']);
    }

    /**
     * Idempotent, and outside the authenticated group on purpose: signing out
     * of a session that already expired must still succeed and clear the
     * cookie, not 401 and leave the website unsure whether it worked.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('student-web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Signed out.']);
    }

    private function startSession(Request $request, Student $student, bool $isNew): JsonResponse
    {
        /*
         * `remember: false`, deliberately. `students` has no remember_token
         * column (see Student::getRememberToken), so a "remember me" cookie
         * could never be honoured — it would only look like it was. The session
         * lives for SESSION_LIFETIME, sliding, which is the website's sign-in
         * length.
         */
        Auth::guard('student-web')->login($student, remember: false);

        // A new id after sign-in, so a session id planted before it (fixation)
        // is worthless afterwards.
        $request->session()->regenerate();

        return response()->json([
            'data' => [
                // Presentation only — picks the greeting. See StudentAuthService.
                'is_new_student' => $isNew,
                'student' => new StudentProfileResource($student),
            ],
        ]);
    }

    /**
     * A session only exists for a request Sanctum recognised as coming from a
     * listed website origin (SANCTUM_STATEFUL_DOMAINS), which is also what puts
     * CSRF protection on it. Anything else — a script, the mobile app — would
     * burn a one-time code on a login that could never be stored, so it is
     * refused before the code is looked at.
     */
    private function assertStateful(Request $request): void
    {
        if (! $request->hasSession()) {
            abort(Response::HTTP_BAD_REQUEST, 'Sign in from the Plan B website or app.');
        }
    }
}
