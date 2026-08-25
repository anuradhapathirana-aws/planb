<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\CourseCategoryController;
use App\Http\Controllers\Admin\CoursePaperController;
use App\Http\Controllers\Admin\CourseProgrammeController;
use App\Http\Controllers\Admin\CourseVideoController;
use App\Http\Controllers\Admin\IndustryController;
use App\Http\Controllers\Admin\ProfessionController;
use App\Http\Controllers\Admin\StudentManagementController;
use App\Http\Controllers\CourseVideoPlaybackController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/admin')->group(function () {
    // Public (unauthenticated) admin-auth endpoints.
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
    Route::get('/unlock/{user}', [AuthController::class, 'unlock'])
        ->name('admin.unlock')
        ->middleware('signed');

    // Authenticated admin panel endpoints (Sanctum SPA cookie session).
    Route::middleware('auth:sanctum')->group(function () {
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
    });
});

/*
 * Video playback. Sits outside /admin and outside the session guard on purpose:
 * a <video> element fetches its source without cookies, so the signature on the
 * short-lived URL is the authorization (CLAUDE.md §7.11). Same route will serve
 * the student player.
 */
Route::prefix('v1')->group(function () {
    Route::get('/course-videos/{video}/playback', CourseVideoPlaybackController::class)
        ->name('course-videos.playback')
        ->middleware('signed');
});
