<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Enums\LoginCodePurpose;
use App\Models\Student;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Issues and checks the one-time codes emailed to a student.
 *
 * Shared by sign-in and account deletion so both follow one set of rules:
 * hashed at rest, short-lived, single use, burned after repeated wrong guesses,
 * and never telling the caller how many guesses remain (backend/CLAUDE.md §4).
 * A code only works for the purpose it was issued for.
 *
 * Sending the email is the caller's job, because each purpose words it
 * differently.
 */
class StudentLoginCodeService
{
    /**
     * Store a fresh code and return its plaintext, for the caller to email.
     *
     * At most one live code per student per purpose: a resend supersedes the
     * previous one, and a sign-in code never voids a pending deletion code.
     */
    public function issue(Student $student, string $email, LoginCodePurpose $purpose, ?string $ip): string
    {
        $config = config('students.login_code');
        $code = $this->generateCode((int) $config['length']);

        DB::transaction(function () use ($student, $email, $purpose, $code, $ip, $config): void {
            $student->loginCodes()->forPurpose($purpose)->live()->update(['voided_at' => now()]);

            $student->loginCodes()->create([
                'purpose' => $purpose,
                'email' => mb_strtolower($email),
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes((int) $config['ttl_minutes']),
                'request_ip' => $ip,
            ]);
        });

        return $code;
    }

    /**
     * Spend a code, or throw the one generic "invalid code" error.
     *
     * Wrong, expired, consumed, superseded and wrong-purpose codes are all
     * indistinguishable to the caller.
     *
     * @throws ValidationException
     */
    public function consume(Student $student, string $email, LoginCodePurpose $purpose, string $code): void
    {
        $record = $student->loginCodes()
            ->forPurpose($purpose)
            ->live()
            ->where('email', mb_strtolower($email))
            ->latest('id')
            ->first();

        if ($record === null || ! $record->isUsable()) {
            throw $this->invalidCode();
        }

        if (! Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');

            // Burn the code once guessing has clearly started. The response is
            // identical to an expired one — never reveal attempts remaining.
            if ($record->attempts + 1 >= (int) config('students.login_code.max_attempts')) {
                $record->forceFill(['voided_at' => now()])->save();
            }

            throw $this->invalidCode();
        }

        $record->forceFill(['consumed_at' => now()])->save();
    }

    /**
     * Hard ceiling on codes per student per day, across every purpose — a
     * harvested token must not be able to run up a mail bill either.
     */
    public function hasHitDailyCap(Student $student): bool
    {
        return $student->loginCodes()
            ->where('created_at', '>=', Carbon::today())
            ->count() >= (int) config('students.login_code.daily_cap');
    }

    public function invalidCode(): ValidationException
    {
        return ValidationException::withMessages([
            'code' => 'That code is not valid or has expired. Request a new one.',
        ]);
    }

    private function generateCode(int $length): string
    {
        $max = (10 ** $length) - 1;

        return str_pad((string) random_int(0, $max), $length, '0', STR_PAD_LEFT);
    }
}
