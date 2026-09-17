<?php

declare(strict_types=1);

namespace App\Services\Student;

use App\Enums\LoginCodePurpose;
use App\Models\CoursePaperAnswer;
use App\Models\Student;
use App\Notifications\StudentAccountDeletionCodeNotification;
use App\Services\Auth\PlayReviewAccess;
use App\Services\Auth\StudentLoginCodeService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A student deleting their own account (Google Play's account-deletion policy).
 *
 * Deletion is **anonymisation**, not a hard delete. Orders, payments, bank slips
 * and enrolments cascade from `students`, and those are finance records Plan B
 * must keep, so the row stays and everything that identifies the person or
 * describes their activity goes. The row is also soft-deleted and blocked, which
 * is what every sign-in path and `EnsureStudentIsActive` already refuse.
 *
 * Kept: `student_id`, `registered_at`, `imported_by`, orders, payments (with
 * receipts and bank reference), enrolments, service purchases.
 */
class StudentAccountService
{
    /** Personal details cleared on deletion. `email` and `google_sub` also free the address for a new account. */
    private const PERSONAL_COLUMNS = [
        'full_name',
        'email',
        'google_sub',
        'email_verified_at',
        'contact_number',
        'address',
        'date_of_birth',
        'highest_qualification',
        'bio',
        'industry_id',
        'profession_id',
        'visa_status',
        'languages_spoken',
    ];

    private const MEDIA_COLLECTIONS = [
        Student::PHOTO_COLLECTION,
        Student::CV_COLLECTION,
        Student::PROFILE_VIDEO_COLLECTION,
    ];

    public function __construct(
        private readonly StudentLoginCodeService $codes,
        private readonly PlayReviewAccess $playReview,
    ) {}

    /**
     * Email the code that confirms a deletion.
     *
     * Unlike sign-in, this may explain its failures: the caller is already
     * authenticated as the account holder, so there is nothing to enumerate.
     *
     * @return array{expires_in_seconds: int, resend_after_seconds: int}
     *
     * @throws ValidationException
     */
    public function requestDeletionCode(Student $student, ?string $ip): array
    {
        $config = config('students.login_code');

        if (! $student->canSelfRegister()) {
            throw ValidationException::withMessages([
                'email' => 'There is no email address on your account, so we cannot send a '
                    .'confirmation code. Please contact Plan B support to delete your account.',
            ]);
        }

        // The Play reviewer confirms with their fixed code, so nothing is emailed.
        if (! $this->playReview->isReviewerEmail($student->email)) {
            if ($this->codes->hasHitDailyCap($student)) {
                throw ValidationException::withMessages([
                    'code' => 'You have asked for too many codes today. Please try again tomorrow.',
                ]);
            }

            $code = $this->codes->issue($student, $student->email, LoginCodePurpose::DeleteAccount, $ip);

            // Queued (CLAUDE.md §4.7).
            $student->notify(new StudentAccountDeletionCodeNotification($code, (int) $config['ttl_minutes']));
        }

        return [
            'expires_in_seconds' => (int) $config['ttl_minutes'] * 60,
            'resend_after_seconds' => (int) $config['resend_after_seconds'],
        ];
    }

    /**
     * Verify the code, then anonymise the account.
     *
     * The code is spent *before* the transaction and outside it: a wrong guess
     * must still count against the attempt limit, and a rollback would undo that.
     *
     * @throws ValidationException
     */
    public function delete(Student $student, string $code): void
    {
        if (! $student->canSelfRegister()) {
            throw $this->codes->invalidCode();
        }

        /*
         * The Play reviewer's deletion is real, like anyone's. Anonymising frees
         * the address, so the next reviewer sign-in makes a fresh account.
         */
        if ($this->playReview->isReviewerEmail($student->email)) {
            if (! $this->playReview->checkCode($code)) {
                throw $this->codes->invalidCode();
            }
        } else {
            $this->codes->consume($student, $student->email, LoginCodePurpose::DeleteAccount, $code);
        }

        DB::transaction(function () use ($student): void {
            // Every device, not just this one.
            $student->tokens()->delete();
            $student->loginCodes()->delete();

            CoursePaperAnswer::query()
                ->whereIn('course_paper_attempt_id', $student->paperAttempts()->select('id'))
                ->delete();
            $student->paperAttempts()->delete();
            $student->videoProgress()->delete();
            $student->programmeProgress()->delete();
            $student->checklistProgress()->delete();
            $student->wishlist()->delete();

            $student->forceFill(array_merge(
                array_fill_keys(self::PERSONAL_COLUMNS, null),
                ['is_blocked' => true, 'anonymised_at' => now()],
            ))->save();

            $student->delete();
        });

        /*
         * Files last, once the database work has committed. Deleting a file
         * cannot be rolled back, so doing it inside the transaction could leave
         * an intact account with its photo and CV gone. Media Library skips its
         * own cleanup on a soft delete, so it has to be asked explicitly.
         */
        foreach (self::MEDIA_COLLECTIONS as $collection) {
            $student->clearMediaCollection($collection);
        }
    }
}
