<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\Student;
use App\Notifications\StudentLoginCodeNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\TransientToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Student sign-in: an emailed one-time code, or Google.
 *
 * Students are never created here. An admin creates or imports the record first
 * and the student then *claims* it — which is why a missing record is a silent
 * no-op rather than a registration.
 */
class StudentAuthService
{
    public function __construct(private readonly GoogleIdTokenVerifier $google) {}

    /**
     * Send a sign-in code, if there is anyone eligible to send one to.
     *
     * Returns the same ticket either way. Distinguishing "no such student" from
     * "code sent" would turn this endpoint into an oracle for which addresses
     * belong to Plan B students, so every branch below is silent by design and
     * the UI copy carries the explanation (backend/CLAUDE.md §4).
     *
     * @return array{expires_in_seconds: int, resend_after_seconds: int}
     */
    public function requestLoginCode(string $email, ?string $ip): array
    {
        $config = config('students.login_code');
        $student = $this->findByEmail($email);

        if ($student !== null && $student->canSignIn() && ! $this->hasHitDailyCap($student)) {
            $code = $this->generateCode((int) $config['length']);

            DB::transaction(function () use ($student, $email, $code, $ip, $config): void {
                // At most one live code per student: a resend supersedes the old one.
                $student->loginCodes()->live()->update(['voided_at' => now()]);

                $student->loginCodes()->create([
                    'email' => mb_strtolower($email),
                    'code_hash' => Hash::make($code),
                    'expires_at' => now()->addMinutes((int) $config['ttl_minutes']),
                    'request_ip' => $ip,
                ]);
            });

            // Queued (CLAUDE.md §4.7). A worker MUST be running or nobody can sign in.
            $student->notify(new StudentLoginCodeNotification($code, (int) $config['ttl_minutes']));
        }

        return [
            'expires_in_seconds' => (int) $config['ttl_minutes'] * 60,
            'resend_after_seconds' => (int) $config['resend_after_seconds'],
        ];
    }

    /**
     * Exchange a code for an access token.
     *
     * @throws ValidationException
     */
    public function verifyLoginCode(string $email, string $code, ?string $deviceName): array
    {
        $student = $this->findByEmail($email);

        // Same message whether the student doesn't exist or the code is wrong.
        if ($student === null) {
            throw $this->invalidCode();
        }

        $this->assertCanSignIn($student);

        $record = $student->loginCodes()
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

        $this->markVerified($student, verifiedEmail: true);

        return $this->issueSession($student, $deviceName);
    }

    /**
     * Sign in with a Google ID token.
     *
     * @throws ValidationException
     */
    public function signInWithGoogle(string $idToken, ?string $deviceName): array
    {
        $payload = $this->google->verify($idToken);

        /*
         * Prefer the stable Google subject id over the address: a student who
         * changes the email on their Google account keeps their record, and a
         * recycled address can't be used to reach someone else's.
         */
        $student = Student::where('google_sub', $payload['sub'])->first()
            ?? $this->findByEmail($payload['email']);

        if ($student === null) {
            /*
             * The only place a sign-in failure is explained, and it is safe to:
             * the caller has already proved they own this Google account, so
             * they learn nothing about anyone else.
             */
            throw ValidationException::withMessages([
                'id_token' => 'We could not find a Plan B student with that email address. '
                    .'Please contact Plan B support to check the email on your record.',
            ]);
        }

        $this->assertCanSignIn($student);

        $student->forceFill(['google_sub' => $payload['sub']])->save();

        $this->markVerified($student, verifiedEmail: true);

        return $this->issueSession($student, $deviceName);
    }

    /**
     * Rotate a still-valid token.
     *
     * The old token is expired rather than deleted so requests already in flight
     * when the app refreshes don't 401 halfway through the swap.
     */
    public function rotateToken(Student $student, ?string $deviceName): array
    {
        $current = $student->currentAccessToken();

        if ($current !== null && ! $current instanceof TransientToken) {
            $current->forceFill([
                'expires_at' => now()->addSeconds((int) config('students.token.rotation_grace_seconds')),
            ])->save();
        }

        $token = $this->createToken($student, $deviceName);

        return [
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
        ];
    }

    /** Revokes only the token that made this request — other devices stay signed in. */
    public function signOut(Student $student): void
    {
        $token = $student->currentAccessToken();

        if ($token !== null && ! $token instanceof TransientToken) {
            $token->delete();
        }
    }

    /**
     * @return array{token: string, expires_at: ?string, student: Student}
     */
    private function issueSession(Student $student, ?string $deviceName): array
    {
        $token = $this->createToken($student, $deviceName);

        return [
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
            'student' => $student->fresh(['industry', 'profession']),
        ];
    }

    private function createToken(Student $student, ?string $deviceName): NewAccessToken
    {
        return $student->createToken(
            name: $this->tokenName($deviceName),
            abilities: config('students.token.abilities'),
            // Per-token, so Sanctum's global `expiration` stays null and admin
            // tokens are untouched.
            expiresAt: now()->addDays((int) config('students.token.ttl_days')),
        );
    }

    private function tokenName(?string $deviceName): string
    {
        $name = trim((string) $deviceName);

        return $name === '' ? 'mobile' : 'mobile: '.mb_substr($name, 0, 60);
    }

    /**
     * First successful sign-in is the "claim": the imported record becomes a
     * registered student. Later sign-ins leave `registered_at` alone.
     */
    private function markVerified(Student $student, bool $verifiedEmail): void
    {
        $changes = [];

        if ($student->registered_at === null) {
            $changes['registered_at'] = now();
        }

        if ($verifiedEmail && $student->email_verified_at === null) {
            $changes['email_verified_at'] = now();
        }

        if ($changes !== []) {
            $student->forceFill($changes)->save();
        }
    }

    private function findByEmail(string $email): ?Student
    {
        $normalized = mb_strtolower(trim($email));

        if ($normalized === '') {
            return null;
        }

        return Student::whereRaw('LOWER(email) = ?', [$normalized])->first();
    }

    /** @throws ValidationException */
    private function assertCanSignIn(Student $student): void
    {
        /*
         * Deliberately a 403 with a real message, unlike every other failure
         * here. By this point the caller holds a valid code or Google token for
         * this record, so they are the account holder — and "your account is
         * suspended" is the one thing they genuinely need told. It also covers a
         * block landing between requesting a code and using it.
         */
        if (! $student->canSignIn()) {
            abort(
                Response::HTTP_FORBIDDEN,
                'Your account has been suspended. Please contact Plan B support.',
            );
        }
    }

    private function hasHitDailyCap(Student $student): bool
    {
        return $student->loginCodes()
            ->where('created_at', '>=', Carbon::today())
            ->count() >= (int) config('students.login_code.daily_cap');
    }

    private function generateCode(int $length): string
    {
        $max = (10 ** $length) - 1;

        return str_pad((string) random_int(0, $max), $length, '0', STR_PAD_LEFT);
    }

    private function invalidCode(): ValidationException
    {
        return ValidationException::withMessages([
            'code' => 'That code is not valid or has expired. Request a new one.',
        ]);
    }
}
