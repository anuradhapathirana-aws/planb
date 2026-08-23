<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\IndustryController;
use App\Http\Controllers\Admin\ProfessionController;
use App\Http\Controllers\Admin\StudentManagementController;
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
    });
});
