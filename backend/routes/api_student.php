<?php

declare(strict_types=1);

use App\Enums\CourseStatus;
use App\Http\Controllers\Student\AuthController;
use App\Http\Controllers\Student\CourseController;
use App\Http\Controllers\Student\PaperController;
use App\Http\Controllers\Student\ProfileController;
use App\Http\Controllers\Student\ReferenceDataController;
use App\Models\CourseProgramme;
use App\Models\CourseVideo;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Student API
|--------------------------------------------------------------------------
|
| Registered in bootstrap/app.php under the `api/v1/student` prefix, on the
| `student` guard. Nothing here may reach the admin `User` model, and nothing
| in routes/api.php may reach a `Student` — see backend/CLAUDE.md §1.
|
*/

/*
 * These bindings ARE the read authorization. "Published" is not a per-student
 * rule, so filtering it in the binding means a draft or soft-deleted programme
 * 404s before any controller runs — and the existing `User`-typed policies stay
 * untouched (backend/CLAUDE.md §2).
 *
 * The parameter names are `course` and `lesson`, NOT `programme` and `video`,
 * and that is deliberate: `Route::bind()` registers a binder globally on the
 * router, not per route file. Reusing the admin route files' parameter names
 * here would silently apply this published-only filter to /api/v1/admin/* too,
 * hiding every draft course from the people whose job is to write them.
 *
 * They also happen to be the right words for this audience — students have
 * courses and lessons; programmes and videos are authoring vocabulary.
 */
Route::bind('course', fn (string $value): CourseProgramme => CourseProgramme::query()
    ->where('status', CourseStatus::Published)
    ->findOrFail($value));

Route::bind('lesson', fn (string $value): CourseVideo => CourseVideo::query()
    ->whereHas('topic.programme', fn ($query) => $query->where('status', CourseStatus::Published))
    ->findOrFail($value));

// Public. Rate limits are named limiters, defined in AppServiceProvider.
Route::post('auth/request-code', [AuthController::class, 'requestCode'])
    ->middleware('throttle:student-login-request');

Route::post('auth/verify-code', [AuthController::class, 'verifyCode'])
    ->middleware('throttle:student-login-verify');

Route::post('auth/google', [AuthController::class, 'google'])
    ->middleware('throttle:student-login-verify');

/*
 * `student.actor` and `student.active` are not redundant with `auth:student`:
 * the first keeps an admin session out (Sanctum's stateful branch reads one
 * global guard list), the second kills a token the moment its student is
 * blocked or deleted, rather than at its 30-day expiry.
 */
Route::middleware(['auth:student', 'student.actor', 'student.active'])->group(function () {
    Route::post('auth/refresh', [AuthController::class, 'refresh']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    // Reference data for the profile form. Active rows only.
    Route::get('industries', [ReferenceDataController::class, 'industries']);
    Route::get('professions', [ReferenceDataController::class, 'professions']);

    // Profile
    Route::get('profile', [ProfileController::class, 'show']);
    Route::put('profile', [ProfileController::class, 'update']);
    Route::post('profile/photo', [ProfileController::class, 'uploadPhoto']);
    Route::delete('profile/photo', [ProfileController::class, 'deletePhoto']);

    // Courses
    Route::get('courses', [CourseController::class, 'index']);
    Route::get('courses/{course}', [CourseController::class, 'show']);

    /*
     * Kept flat rather than nested three deep under the course (CLAUDE.md §6
     * caps nesting at two levels) — the player only ever holds a lesson id.
     */
    Route::get('lessons/{lesson}/stream', [CourseController::class, 'stream']);
    Route::post('lessons/{lesson}/progress', [CourseController::class, 'recordProgress'])
        ->middleware('throttle:student-progress');

    // Assessments
    Route::get('courses/{course}/paper', [PaperController::class, 'show']);
    Route::post('courses/{course}/paper/attempts', [PaperController::class, 'start']);
    Route::post('paper-attempts/{attempt}/submit', [PaperController::class, 'submit']);
    Route::get('paper-attempts/{attempt}', [PaperController::class, 'result']);
});
