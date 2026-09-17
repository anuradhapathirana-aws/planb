<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Enums\LoginCodePurpose;
use App\Models\Student;
use App\Notifications\StudentLoginCodeNotification;
use App\Services\Student\StudentIdGenerator;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\TransientToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Student sign-in and sign-up: an emailed one-time code, or Google.
 *
 * Two ways in, and they are deliberately NOT symmetric:
 *
 * - **Emailed code** only ever *claims* an existing record. An admin creates or
 *   imports the student first, and a missing record is a silent no-op, because
 *   this path answers identically whether or not the address is one of ours.
 * - **Google** may also *register*. A Google ID token proves the caller owns a
 *   verified mailbox before we write anything, so there is no address to guess
 *   at and no mail for us to send — which is what makes creating a record here
 *   safe when creating one from a typed-in address would not be.
 */
class StudentAuthService
{
    public function __construct(
        private readonly GoogleIdTokenVerifier $google,
        private readonly StudentIdGenerator $studentIds,
        private readonly StudentLoginCodeService $codes,
        private readonly PlayReviewAccess $playReview,
    ) {}

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
        // The Play reviewer has a fixed code, so nothing is emailed — same ticket back.
        $student = $this->playReview->isReviewerEmail($email) ? null : $this->findByEmail($email);

        if ($student !== null && $student->canSignIn() && ! $this->codes->hasHitDailyCap($student)) {
            $code = $this->codes->issue($student, $email, LoginCodePurpose::SignIn, $ip);

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
        if ($this->playReview->isReviewerEmail($email)) {
            return $this->verifyReviewerCode($code, $deviceName);
        }

        $student = $this->findByEmail($email);

        // Same message whether the student doesn't exist or the code is wrong.
        if ($student === null) {
            throw $this->codes->invalidCode();
        }

        $this->assertCanSignIn($student);

        $this->codes->consume($student, $email, LoginCodePurpose::SignIn, $code);

        $this->markVerified($student, verifiedEmail: true);

        return $this->issueSession($student, $deviceName);
    }

    /**
     * Google Play's reviewer, with the fixed code from config/play_review.php.
     *
     * The code is checked before the account is looked at, so a wrong code
     * learns nothing — not even whether the reviewer account is suspended. The
     * account is created here if a reviewer deleted it (see PlayReviewAccess).
     *
     * @throws ValidationException
     */
    private function verifyReviewerCode(string $code, ?string $deviceName): array
    {
        if (! $this->playReview->checkCode($code)) {
            throw $this->codes->invalidCode();
        }

        $student = $this->playReview->student();

        $this->assertCanSignIn($student);

        $this->markVerified($student, verifiedEmail: true);

        return $this->issueSession($student, $deviceName, isNew: $student->wasRecentlyCreated);
    }

    /**
     * Sign in with a Google ID token, registering the student if they are new.
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
        $student = $this->findByGoogle($payload['sub'], $payload['email']);
        $isNew = false;

        if ($student === null) {
            if (! config('students.google.allow_registration')) {
                /*
                 * The only place a sign-in failure is explained, and it is safe
                 * to: the caller has already proved they own this Google
                 * account, so they learn nothing about anyone else.
                 */
                throw ValidationException::withMessages([
                    'id_token' => 'We could not find a Plan B student with that email address. '
                        .'Please contact Plan B support to check the email on your record.',
                ]);
            }

            $student = $this->register($payload);
            $isNew = $student->wasRecentlyCreated;
        }

        $this->assertCanSignIn($student);

        $student->forceFill(['google_sub' => $payload['sub']])->save();

        $this->markVerified($student, verifiedEmail: true);

        return $this->issueSession($student, $deviceName, isNew: $isNew);
    }

    /**
     * Create a student from a verified Google profile.
     *
     * Only the three things Google actually vouches for are written — name,
     * address, subject id. Every other column stays null and is filled in later
     * from the app's own profile screen; a signup that stopped to ask for a visa
     * status would lose people at the one moment they have nothing invested yet.
     *
     * `is_blocked` and `imported_by` keep their defaults on purpose: a
     * self-registered student is unblocked and belongs to no importing admin,
     * which is also how the admin panel can tell the two intakes apart.
     *
     * @param  array{sub: string, email: string, email_verified: bool, name: ?string}  $payload
     */
    private function register(array $payload): Student
    {
        try {
            return DB::transaction(fn (): Student => Student::create([
                // Allocated inside the transaction, so the row lock the generator
                // takes is still held when the insert lands.
                'student_id' => $this->studentIds->next(),
                'full_name' => $this->displayName($payload['name']),
                'email' => $payload['email'],
                'registered_at' => now(),
            ]));
        } catch (QueryException $exception) {
            /*
             * Two taps on the Google button, or two devices at once, race here:
             * both find no record, both insert. The unique indexes on `email` and
             * `google_sub` are what actually settle it, so the loser reads back
             * the winner's row rather than failing a sign-in that should have
             * worked. Anything that is not that race is rethrown.
             */
            $student = $this->findByGoogle($payload['sub'], $payload['email']);

            if ($student === null) {
                throw $exception;
            }

            return $student;
        }
    }

    /**
     * The record behind a Google account: by subject id first, then by address.
     *
     * The email fallback is what lets a student an admin imported months ago
     * sign in with Google on their first try — after which `google_sub` is
     * stamped on the record and takes over.
     */
    private function findByGoogle(string $sub, string $email): ?Student
    {
        return Student::where('google_sub', $sub)->first() ?? $this->findByEmail($email);
    }

    /** Google's `name` is free text, and may be absent, blank or absurdly long. */
    private function displayName(?string $name): ?string
    {
        $trimmed = trim((string) $name);

        return $trimmed === '' ? null : mb_substr($trimmed, 0, 255);
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
     * `is_new_student` is presentation only — it tells the app whether to open
     * on a welcome rather than a "welcome back". Nothing is authorised by it,
     * and a client that ignores it loses nothing but the greeting.
     *
     * @return array{token: string, expires_at: ?string, student: Student, is_new_student: bool}
     */
    private function issueSession(Student $student, ?string $deviceName, bool $isNew = false): array
    {
        $token = $this->createToken($student, $deviceName);

        return [
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
            'student' => $student->fresh(['industry', 'profession']),
            'is_new_student' => $isNew,
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
}
