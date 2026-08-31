<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\ChecklistItemController;
use App\Http\Controllers\Admin\CourseCategoryController;
use App\Http\Controllers\Admin\CoursePaperController;
use App\Http\Controllers\Admin\CourseProgrammeController;
use App\Http\Controllers\Admin\CourseVideoController;
use App\Http\Controllers\Admin\IndustryController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\ProfessionController;
use App\Http\Controllers\Admin\StudentManagementController;
use App\Http\Controllers\CheckoutRedirectController;
use App\Http\Controllers\CourseVideoPlaybackController;
use App\Http\Controllers\PaymentWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/admin')->group(function () {
    // Public (unauthenticated) admin-auth endpoints.
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::get('/unlock/{user}', [AuthController::class, 'unlock'])
        ->name('admin.unlock')
        ->middleware('signed');

    /*
     * Authenticated admin panel endpoints (Sanctum SPA cookie session).
     *
     * `admin.actor` is not redundant with `auth:sanctum`: Sanctum's stateful
     * branch checks one global guard list, so it rejects a signed-in *student*
     * that the guard alone would let through. See backend/CLAUDE.md §1.
     */
    Route::middleware(['auth:sanctum', 'admin.actor'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::get('/students/stats', [StudentManagementController::class, 'stats']);
        Route::get('/students/next-id', [StudentManagementController::class, 'nextId']);
        Route::post('/students/import', [StudentManagementController::class, 'import']);
        Route::post('/students/{student}/block', [StudentManagementController::class, 'block']);
        Route::post('/students/{student}/unblock', [StudentManagementController::class, 'unblock']);
        Route::post('/students/{student}/photo', [StudentManagementController::class, 'uploadPhoto']);
        Route::delete('/students/{student}/photo', [StudentManagementController::class, 'deletePhoto']);
        Route::apiResource('students', StudentManagementController::class)
            ->parameters(['students' => 'student']);

        // Master data (FR-ADM-012): admin-managed industry / profession lists used by the Student form.
        Route::post('/industries/{industry}/activate', [IndustryController::class, 'activate']);
        Route::post('/industries/{industry}/deactivate', [IndustryController::class, 'deactivate']);
        Route::apiResource('industries', IndustryController::class)->except(['destroy']);

        Route::post('/professions/{profession}/activate', [ProfessionController::class, 'activate']);
        Route::post('/professions/{profession}/deactivate', [ProfessionController::class, 'deactivate']);
        Route::apiResource('professions', ProfessionController::class)->except(['destroy']);

        // Course Module content (FR-ADM-008/008a/008b): Category -> Programme -> Topic -> Video.
        Route::post('/course-categories/{category}/activate', [CourseCategoryController::class, 'activate']);
        Route::post('/course-categories/{category}/deactivate', [CourseCategoryController::class, 'deactivate']);
        Route::apiResource('course-categories', CourseCategoryController::class)
            ->parameters(['course-categories' => 'category'])
            ->except(['destroy']);

        // Topics and videos have no endpoints of their own: the Course form saves
        // the whole tree through the programme, which keeps a partly-saved course
        // impossible. Only the lesson *files* are handled per video.
        Route::post('/course-programmes/{programme}/thumbnail', [CourseProgrammeController::class, 'uploadThumbnail']);
        Route::delete('/course-programmes/{programme}/thumbnail', [CourseProgrammeController::class, 'deleteThumbnail']);
        Route::post('/course-programmes/{programme}/publish', [CourseProgrammeController::class, 'publish']);
        Route::post('/course-programmes/{programme}/unpublish', [CourseProgrammeController::class, 'unpublish']);
        Route::apiResource('course-programmes', CourseProgrammeController::class)
            ->parameters(['course-programmes' => 'programme']);

        // Q&A paper (FR-ADM-008c): a singleton under its programme, saved whole.
        Route::get('/course-programmes/{programme}/paper', [CoursePaperController::class, 'show']);
        Route::put('/course-programmes/{programme}/paper', [CoursePaperController::class, 'update']);
        Route::delete('/course-programmes/{programme}/paper', [CoursePaperController::class, 'destroy']);

        Route::post('/course-videos/{video}/file', [CourseVideoController::class, 'uploadFile']);
        Route::delete('/course-videos/{video}/file', [CourseVideoController::class, 'deleteFile']);
        Route::post('/course-videos/{video}/thumbnail', [CourseVideoController::class, 'uploadThumbnail']);
        Route::delete('/course-videos/{video}/thumbnail', [CourseVideoController::class, 'deleteThumbnail']);
        Route::get('/course-videos/{video}/stream', [CourseVideoController::class, 'stream']);

        // Orders, payments and the bank-transfer verification queue (FR-ADM-018-021).
        Route::get('/orders/stats', [OrderController::class, 'stats']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{order}', [OrderController::class, 'show']);
        Route::post('/payments/{payment}/approve', [OrderController::class, 'approve']);
        Route::post('/payments/{payment}/reject', [OrderController::class, 'reject']);

        /*
         * Arrival checklists. Two fixed phases, each saved whole:
         * `{phase}` resolves by implicit enum binding, so an unknown phase 404s
         * before the controller runs. Not a paginated resource — the admin
         * edits the entire list in one tab.
         */
        Route::get('/checklists/{phase}', [ChecklistItemController::class, 'index']);
        Route::put('/checklists/{phase}', [ChecklistItemController::class, 'update']);
    });
});

/*
 * Video playback. Sits outside /admin and outside the session guard on purpose:
 * a <video> element fetches its source without cookies, so the signature on the
 * short-lived URL is the authorization (CLAUDE.md §7.11). Same route will serve
 * the student player.
 */
Route::prefix('v1')->group(function () {
    /*
     * Gateway callbacks. Unauthenticated by necessity - the caller is the
     * gateway's server. The signature inside the payload is the authentication,
     * checked by the driver before anything is written (CLAUDE.md §7.9).
     */
    Route::post('/payments/webhook/{gateway}', PaymentWebhookController::class)
        ->name('payments.webhook')
        ->middleware('throttle:60,1');

    /*
     * Hands a student's in-app browser to the gateway's hosted checkout. Not
     * authenticated: a browser tab carries no bearer token, so the signature on
     * the URL is the authorization - the same reasoning as video playback. It
     * writes nothing and cannot settle a payment.
     */
    Route::get('/payments/checkout/{payment}', CheckoutRedirectController::class)
        ->name('payments.checkout.redirect')
        ->middleware(['signed', 'throttle:30,1']);

    // Local stand-in for a hosted checkout page; 404s in production.
    Route::get('/payments/sandbox/{payment}/confirm', [PaymentWebhookController::class, 'sandboxConfirm'])
        ->name('payments.sandbox.confirm')
        ->middleware('signed');

    Route::get('/course-videos/{video}/playback', CourseVideoPlaybackController::class)
        ->name('course-videos.playback')
        ->middleware('signed');
});
