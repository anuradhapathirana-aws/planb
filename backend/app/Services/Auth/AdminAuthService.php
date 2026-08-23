<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use App\Notifications\AdminAccountLockedNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthService
{
    private const MAX_ATTEMPTS = 5;

    private const LOCK_SENTINEL_YEARS = 100; // "locked until explicitly unlocked" — NFR-008 requires email-based unlock, not a timer.

    /**
     * @throws ValidationException
     */
    public function attempt(string $email, string $password): User
    {
        $user = User::where('email', $email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'email' => 'This account is locked. Check your email for an unlock link.',
            ]);
        }

        if (! Hash::check($password, $user->password)) {
            $this->registerFailedAttempt($user);

            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        if ($user->failed_login_attempts > 0) {
            $user->forceFill(['failed_login_attempts' => 0])->save();
        }

        return $user;
    }

    private function registerFailedAttempt(User $user): void
    {
        $attempts = $user->failed_login_attempts + 1;

        if ($attempts >= self::MAX_ATTEMPTS) {
            $user->forceFill([
                'failed_login_attempts' => $attempts,
                'locked_until' => now()->addYears(self::LOCK_SENTINEL_YEARS),
            ])->save();

            $user->notify(new AdminAccountLockedNotification);

            return;
        }

        $user->forceFill(['failed_login_attempts' => $attempts])->save();
    }

    public function unlock(User $user): void
    {
        $user->forceFill([
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ])->save();
    }
}
