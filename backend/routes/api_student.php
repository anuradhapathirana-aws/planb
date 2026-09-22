<?php

declare(strict_types=1);

use App\Enums\CourseStatus;
use App\Http\Controllers\Student\AccountController;
use App\Http\Controllers\Student\AppConfigController;
use App\Http\Controllers\Student\AuthController;
use App\Http\Controllers\Student\ChecklistController;
use App\Http\Controllers\Student\CourseCategoryController;
use App\Http\Controllers\Student\CourseController;
use App\Http\Controllers\Student\EnrolmentController;
use App\Http\Controllers\Student\HomeController;
use App\Http\Controllers\Student\LearnerController;
use App\Http\Controllers\Student\PaperController;
use App\Http\Controllers\Student\PaymentController;
use App\Http\Controllers\Student\ProfileController;
use App\Http\Controllers\Student\ReferenceDataController;
use App\Http\Controllers\Student\ServiceController;
use App\Http\Controllers\Student\WishlistController;
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
 * Logo and intro, read before the app knows whether anyone is signed in — the
 * intro plays ahead of Sign in too. Branding only; bank details stay behind
 * the authenticated payment endpoint below.
 */
Route::get('app-config', [AppConfigController::class, 'show'])->middleware('throttle:60,1');

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

    /*
     * Account deletion (Google Play policy). Two steps: email a confirmation
     * code, then delete with it — holding the signed-in phone is not enough on
     * its own. Limited per student, since every code request sends an email.
     */
    Route::post('account/deletion-code', [AccountController::class, 'requestDeletionCode'])
        ->middleware('throttle:student-account-deletion-request');
    Route::delete('account', [AccountController::class, 'destroy'])
        ->middleware('throttle:student-account-deletion');

    /*
     * Home. Only what no other tab already serves — the screen's two progress
     * summaries reuse the courses and checklists endpoints so Home warms their
     * caches rather than duplicating their data.
     */
    Route::get('home-banners', [HomeController::class, 'banners']);

    /*
     * The LKR/AED rate behind Home's converter. Display only — it never prices
     * anything, and no amount derived from it may reach an order.
     */
    Route::get('exchange-rate', [HomeController::class, 'exchangeRate']);

    /*
     * The faces on Course Details' "N learners" row. Not nested under a course
     * on purpose — see LearnerAvatarService for why it is not course-scoped.
     */
    Route::get('learner-avatars', LearnerController::class);

    /*
     * Home's "Top Categories" row: every active category, in admin order, with
     * its icon — including categories with no published courses yet. Not derived
     * from the course list, because an empty category would then never appear.
     */
    Route::get('course-categories', [CourseCategoryController::class, 'index']);

    /*
     * One category's page and buying its course bundle. A raw numeric id, not a bound
     * model, for the reason given above `services/{service}` below: a global
     * visibility binder named `category` would also filter the admin routes.
     */
    Route::get('course-categories/{category}', [CourseCategoryController::class, 'show'])
        ->whereNumber('category');
    Route::post('course-categories/{category}/purchase', [CourseCategoryController::class, 'purchase'])
        ->whereNumber('category')
        ->middleware('throttle:20,1');

    // Courses
    Route::get('courses', [CourseController::class, 'index']);
    Route::get('courses/{course}', [CourseController::class, 'show']);

    /*
     * The wishlist — the heart on a course tile. Add and remove are separate
     * verbs rather than one toggle, and both are idempotent, so a retried
     * request lands on the state the student asked for instead of flipping it
     * back. `{course}` goes through the published-only binding above, so only a
     * course a student can see can be saved. Throttled for a burst of taps.
     */
    Route::get('wishlist', [WishlistController::class, 'index']);
    Route::post('courses/{course}/wishlist', [WishlistController::class, 'store'])
        ->middleware('throttle:60,1');
    Route::delete('courses/{course}/wishlist', [WishlistController::class, 'destroy'])
        ->middleware('throttle:60,1');

    /*
     * Kept flat rather than nested three deep under the course (CLAUDE.md §6
     * caps nesting at two levels) — the player only ever holds a lesson id.
     */
    Route::get('lessons/{lesson}/stream', [CourseController::class, 'stream']);
    Route::post('lessons/{lesson}/progress', [CourseController::class, 'recordProgress'])
        ->middleware('throttle:student-progress');

    // Assessments
    /*
     |--------------------------------------------------------------------------
     | Enrolment and payment
     |--------------------------------------------------------------------------
     |
     | `enrol` is the single entry point: a free course enrols immediately, a paid
     | one opens an order. The price always comes from the course on the server.
     */
    Route::post('courses/{course}/enrol', [EnrolmentController::class, 'store'])
        ->middleware('throttle:20,1');

    /*
     |--------------------------------------------------------------------------
     | Premium services
     |--------------------------------------------------------------------------
     |
     | Paid one-off help - CV writing, visa consultation. Same order/payment
     | layer as a course; only what a settled order produces differs.
     |
     | These take a raw `{service}` id rather than a model-bound one on purpose.
     | `Route::bind` registers GLOBALLY, so a published-only binder here would
     | also hide every draft service from `/admin/services/{service}` - the trap
     | this file already documents for `course`. The published scope lives in
     | `StudentServiceCatalogService` instead, and it is the authorization.
     |
     | `service-purchases` is declared before `services/{service}` only for
     | readability; the two cannot collide.
     */
    Route::get('service-purchases', [ServiceController::class, 'purchases']);
    Route::get('services', [ServiceController::class, 'index']);
    Route::get('services/{service}', [ServiceController::class, 'show'])
        ->whereNumber('service');
    Route::post('services/{service}/purchase', [ServiceController::class, 'purchase'])
        ->whereNumber('service')
        ->middleware('throttle:20,1');

    Route::get('orders', [PaymentController::class, 'index']);
    Route::get('orders/{order}', [PaymentController::class, 'show']);
    Route::post('orders/{order}/card', [PaymentController::class, 'payByCard'])
        ->middleware('throttle:20,1');
    Route::post('orders/{order}/bank-transfer', [PaymentController::class, 'payByBankTransfer'])
        ->middleware('throttle:10,1');
    Route::get('payment-methods/bank-transfer', [PaymentController::class, 'bankDetails']);

    /*
     * Arrival checklists (FR-MOB-030). Both phases come back in one response —
     * they are two tabs over a few dozen short rows, so a request per tab would
     * buy a spinner and nothing else.
     *
     * The tick is a PUT carrying the state the student wants, not a toggle: a
     * retry on a flaky connection then lands on the same answer instead of
     * flipping the step back. Rate limited generously — working down a
     * checklist is a burst of taps, not abuse.
     */
    Route::get('checklists', [ChecklistController::class, 'index']);
    Route::put('checklist-items/{checklistItem}', [ChecklistController::class, 'update'])
        ->middleware('throttle:120,1');

    Route::get('courses/{course}/paper', [PaperController::class, 'show']);
    Route::post('courses/{course}/paper/attempts', [PaperController::class, 'start']);
    Route::post('paper-attempts/{attempt}/submit', [PaperController::class, 'submit']);
    Route::get('paper-attempts/{attempt}', [PaperController::class, 'result']);
});
