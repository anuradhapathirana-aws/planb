<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\Student;
use App\Notifications\StudentAccountExistsNotification;
use App\Notifications\StudentRegistrationCodeNotification;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Signing up with an email address: hold the details, email a code, and hand
 * the details back once the code is proved.
 *
 * **Nothing is written to `students` until the code comes back.** Creating the
 * row from whatever was typed would let anyone fill the table with addresses
 * they do not own — the reason the sign-in code path never registers anyone.
 * The pending sign-up lives in the cache for the code's lifetime instead, so an
 * abandoned or junk sign-up simply expires. `student_login_codes` cannot hold
 * it: every row there belongs to a student that already exists.
 *
 * **The response never says whether the address is taken.** A new address gets
 * a code; an address that already has an account gets an email telling its
 * owner so; a blocked, deleted or capped one gets nothing. All three return the
 * same ticket — see backend/CLAUDE.md §4.
 *
 * Creating the student is `StudentAuthService`'s job, beside the Google
 * sign-up, so there is one place that decides who may hold a session.
 */
class StudentRegistrationService
{
    public function __construct(
        private readonly PlayReviewAccess $playReview,
        private readonly StudentLoginCodeService $codes,
    ) {}

    /**
     * @param  array{full_name: string, email: string, contact_number: string, date_of_birth: string}  $details
     * @return array{expires_in_seconds: int, resend_after_seconds: int}
     */
    public function requestCode(array $details, ?string $ip): array
    {
        $this->assertOpen();

        $config = config('students.login_code');
        $email = $this->normalize($details['email']);

        // The Play reviewer signs in with a fixed code and never registers.
        if (! $this->playReview->isReviewerEmail($email) && ! $this->hasHitDailyCap($email)) {
            $this->countSend($email);

            // withTrashed: an address held by a deleted record is still taken by
            // the unique index, and must not be told apart from any other.
            $existing = Student::withTrashed()->whereRaw('LOWER(email) = ?', [$email])->first();

            if ($existing === null) {
                $this->issue([...$details, 'email' => $email], $ip);
            } elseif ($existing->canSignIn()) {
                // Queued (CLAUDE.md §4.7), like every other student email.
                $existing->notify(new StudentAccountExistsNotification);
            }
        }

        return [
            'expires_in_seconds' => (int) $config['ttl_minutes'] * 60,
            'resend_after_seconds' => (int) $config['resend_after_seconds'],
        ];
    }

    /**
     * Spend a sign-up code and return the details it was issued for.
     *
     * Wrong, expired, superseded and never-issued codes all get the one generic
     * error, and the attempt count is never revealed (backend/CLAUDE.md §4).
     * Held under a lock so two taps of "Verify" cannot both succeed, and so
     * concurrent wrong guesses cannot each read the same attempt count.
     *
     * @return array{full_name: string, email: string, contact_number: string, date_of_birth: string}
     *
     * @throws ValidationException
     */
    public function consume(string $email, string $code): array
    {
        $this->assertOpen();

        $key = $this->key($this->normalize($email));

        try {
            return Cache::lock($key.':lock', 10)->block(5, fn (): array => $this->check($key, $code));
        } catch (LockTimeoutException) {
            throw $this->codes->invalidCode();
        }
    }

    /**
     * @return array{full_name: string, email: string, contact_number: string, date_of_birth: string}
     *
     * @throws ValidationException
     */
    private function check(string $key, string $code): array
    {
        $pending = Cache::get($key);

        if (! is_array($pending) || $pending['expires_at'] <= now()->getTimestamp()) {
            throw $this->codes->invalidCode();
        }

        if (! Hash::check($code, $pending['code_hash'])) {
            $attempts = $pending['attempts'] + 1;

            // Burn the sign-up once guessing has clearly started.
            if ($attempts >= (int) config('students.login_code.max_attempts')) {
                Cache::forget($key);
            } else {
                Cache::put(
                    $key,
                    [...$pending, 'attempts' => $attempts],
                    Carbon::createFromTimestamp($pending['expires_at']),
                );
            }

            throw $this->codes->invalidCode();
        }

        Cache::forget($key);

        return $pending['details'];
    }

    /**
     * Store the pending sign-up and email its code. A resend replaces the
     * previous one, so only the newest code works — and newly typed details win.
     *
     * @param  array{full_name: string, email: string, contact_number: string, date_of_birth: string}  $details
     */
    private function issue(array $details, ?string $ip): void
    {
        $ttlMinutes = (int) config('students.login_code.ttl_minutes');
        $expiresAt = now()->addMinutes($ttlMinutes);
        $code = $this->generateCode((int) config('students.login_code.length'));

        Cache::put($this->key($details['email']), [
            'details' => $details,
            // Hashed, never plaintext: a cache dump must not hand over live codes.
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => $expiresAt->getTimestamp(),
            // Abuse forensics only. Never logged (CLAUDE.md §13.10).
            'request_ip' => $ip,
        ], $expiresAt);

        Notification::route('mail', $details['email'])
            ->notify(new StudentRegistrationCodeNotification($code, $ttlMinutes));
    }

    /**
     * A per-address daily ceiling on emails sent from this form, on top of the
     * route's rate limiters — the same guard the sign-in code has against a
     * harvested address being used to run up a mail bill or flood an inbox.
     */
    private function hasHitDailyCap(string $email): bool
    {
        return (int) Cache::get($this->sendsKey($email), 0) >= (int) config('students.login_code.daily_cap');
    }

    private function countSend(string $email): void
    {
        $key = $this->sendsKey($email);

        Cache::add($key, 0, now()->endOfDay());
        Cache::increment($key);
    }

    /** @throws HttpException */
    private function assertOpen(): void
    {
        if (! config('students.registration.enabled')) {
            abort(
                Response::HTTP_FORBIDDEN,
                'Sign-up is closed right now. Please contact Plan B support.',
            );
        }
    }

    /** Hashed, so no address sits in a cache key where a dump or a log could show it. */
    private function key(string $email): string
    {
        return 'student-registration:'.hash('sha256', $email);
    }

    private function sendsKey(string $email): string
    {
        return 'student-registration-sends:'.hash('sha256', $email).':'.now()->toDateString();
    }

    private function normalize(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    private function generateCode(int $length): string
    {
        return str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);
    }
}
