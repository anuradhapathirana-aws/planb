<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects anyone who is authenticated but is not an admin `User`.
 *
 * The `sanctum` guard's `users` provider already stops a student's *bearer
 * token* here. This closes the other half: Sanctum's stateful branch loops over
 * a single global `sanctum.guard` list (see backend/CLAUDE.md §1), so once a
 * student session guard exists for the web student area, a signed-in student
 * would otherwise satisfy `auth:sanctum` on admin routes — and land in a policy
 * that type-hints `User`, turning a missed 401 into a TypeError or worse.
 *
 * Cheap, explicit, and covered by tests/Feature/GuardIsolationTest.php.
 */
class EnsureAdminActor
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof User) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        return $next($request);
    }
}
