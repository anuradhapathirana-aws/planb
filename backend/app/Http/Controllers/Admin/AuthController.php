<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AdminLoginRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\Auth\AdminAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function __construct(private readonly AdminAuthService $authService) {}

    public function login(AdminLoginRequest $request): JsonResponse
    {
        $user = $this->authService->attempt(
            $request->validated('email'),
            $request->validated('password'),
        );

        // Regenerating the session guards against fixation, but only applies when the
        // request actually carries a session — i.e. Sanctum recognised it as a stateful
        // SPA request (matching Origin/Referer against SANCTUM_STATEFUL_DOMAINS).
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        Auth::guard('web')->login($user, remember: false);

        return response()->json(['data' => new AdminUserResource($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => new AdminUserResource($request->user())]);
    }

    public function unlock(Request $request, User $user): JsonResponse
    {
        if (! $request->hasValidSignature()) {
            abort(403, 'This unlock link is invalid or has expired.');
        }

        app(AdminAuthService::class)->unlock($user);

        return response()->json(['message' => 'Your account has been unlocked. You may now sign in.']);
    }
}
