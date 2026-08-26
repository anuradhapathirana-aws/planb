<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Student;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Stops a blocked or deleted student on every request, not just at sign-in.
 *
 * Tokens are revoked when an admin blocks a student, so this is belt to that
 * braces — it also covers a token minted in the same moment a block lands, and
 * a student soft-deleted while holding a live token.
 *
 * Runs after `EnsureStudentActor`, so `$request->user()` is known to be a Student.
 */
class EnsureStudentIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $student = $request->user();

        if ($student instanceof Student && ! $student->canSignIn()) {
            abort(
                Response::HTTP_FORBIDDEN,
                'Your account has been suspended. Please contact Plan B support.',
            );
        }

        return $next($request);
    }
}
