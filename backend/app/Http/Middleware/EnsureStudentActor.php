<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Student;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The mirror of {@see EnsureAdminActor}: rejects anyone on a student route who
 * is not a `Student`.
 *
 * As well as keeping an admin out, this is what lets the student policies
 * (`CoursePaperAttemptPolicy` and friends) type-hint `Student` without ever
 * receiving a `User` and blowing up with a TypeError.
 */
class EnsureStudentActor
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof Student) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        return $next($request);
    }
}
