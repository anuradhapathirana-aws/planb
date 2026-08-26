<?php

use App\Http\Middleware\EnsureAdminActor;
use App\Http\Middleware\EnsureStudentActor;
use App\Http\Middleware\EnsureStudentIsActive;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        /*
         * The student API lives in its own file rather than another group inside
         * api.php: it runs on a different guard with a different actor type, and
         * keeping the two apart on disk makes it much harder to add a student
         * route to the admin group by accident.
         */
        then: function () {
            Route::middleware('api')
                ->prefix('api/v1/student')
                ->name('student.')
                ->group(base_path('routes/api_student.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        /*
         * Only engages when Origin/Referer matches SANCTUM_STATEFUL_DOMAINS, i.e.
         * the web SPA. React Native sends no Origin, so mobile requests skip the
         * session/CSRF path entirely and authenticate by bearer token.
         */
        $middleware->statefulApi();

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,

            // Actor separation — see backend/CLAUDE.md §1. Not optional.
            'admin.actor' => EnsureAdminActor::class,
            'student.actor' => EnsureStudentActor::class,
            'student.active' => EnsureStudentIsActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());
    })->create();
