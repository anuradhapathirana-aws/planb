<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\Student;
use App\Services\Student\StudentIdGenerator;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;

/**
 * The fixed sign-in code for Google Play's app reviewers (config/play_review.php).
 *
 * Reviewers cannot receive our emailed codes, and an app they cannot sign in to
 * is rejected. So one configured address accepts one configured code — for
 * sign-in and for confirming account deletion — and never has a code emailed.
 *
 * What keeps this from being a back door:
 *
 * - **Off unless both values are set**, and set to a code the app can type.
 * - **One address only.** The code does nothing for any other student.
 * - **Wrong codes lock it for an hour** after a handful, across all IPs, on top
 *   of the normal per-email/IP route throttles.
 * - **An admin can still stop it** without touching the server: blocking or
 *   deleting the reviewer student refuses sign-in like any other student's.
 *
 * The account repairs itself. If a reviewer deletes it (anonymisation frees the
 * address), the next reviewer sign-in creates a fresh, empty one, so the review
 * of the next app update still works with no admin involved.
 */
class PlayReviewAccess
{
    private const FAILURE_KEY = 'play-review:failures';

    public function __construct(private readonly StudentIdGenerator $studentIds) {}

    public function isEnabled(): bool
    {
        $length = (int) config('students.login_code.length');

        return config('play_review.email') !== ''
            && preg_match('/^\d{'.$length.'}$/', (string) config('play_review.code')) === 1;
    }

    public function isReviewerEmail(?string $email): bool
    {
        return $this->isEnabled()
            && mb_strtolower(trim((string) $email)) === config('play_review.email');
    }

    /**
     * Whether `$code` is the reviewer code. Counts a wrong one towards the lock.
     *
     * Callers answer a `false` with the same generic "invalid code" error as any
     * other wrong code — a locked state is never told apart from a wrong code.
     */
    public function checkCode(string $code): bool
    {
        $maxFailures = (int) config('play_review.max_failures_per_hour');

        if (RateLimiter::tooManyAttempts(self::FAILURE_KEY, $maxFailures)) {
            return false;
        }

        if (hash_equals((string) config('play_review.code'), $code)) {
            return true;
        }

        RateLimiter::hit(self::FAILURE_KEY, 3600);

        return false;
    }

    /**
     * The reviewer's student record, created if there is none.
     *
     * Soft-deleted rows are included on purpose: an admin who deleted or blocked
     * the reviewer meant to stop it, so that row is returned for the normal
     * "suspended" refusal instead of quietly being replaced by a new account. A
     * self-deleted account has no email left, so it is not found and a new one
     * is made.
     */
    public function student(): Student
    {
        return $this->find() ?? $this->create();
    }

    private function find(): ?Student
    {
        return Student::withTrashed()
            ->whereRaw('LOWER(email) = ?', [config('play_review.email')])
            ->first();
    }

    private function create(): Student
    {
        try {
            return DB::transaction(fn (): Student => Student::create([
                'student_id' => $this->studentIds->next(),
                'full_name' => config('play_review.full_name'),
                'email' => config('play_review.email'),
                'registered_at' => now(),
            ]));
        } catch (QueryException $exception) {
            // Two reviewer sign-ins racing: the unique email index picks a winner.
            return $this->find() ?? throw $exception;
        }
    }
}
