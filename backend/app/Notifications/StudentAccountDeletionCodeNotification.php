<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The one-time code that confirms a student wants their account deleted.
 *
 * Sent to the mailbox rather than trusted from the signed-in phone, so someone
 * holding an unlocked handset cannot erase an account on their own. Queued
 * like the sign-in code, with the same short retry window.
 */
class StudentAccountDeletionCodeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        private readonly string $code,
        private readonly int $ttlMinutes,
    ) {}

    /** A code is worthless once it expires, so don't retry into a dead window. */
    public function retryUntil(): \DateTimeInterface
    {
        return now()->addMinutes(max(1, $this->ttlMinutes - 1));
    }

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // As with the sign-in code, the code never appears in the subject or preheader.
        return (new MailMessage)
            ->subject('Confirm deleting your Plan B account')
            ->view(['emails.code', 'emails.code-text'], [
                'preheader' => 'Someone asked to delete your Plan B account.',
                'heading' => 'Delete your Plan B account?',
                'intro' => 'Enter this code in the Plan B app to permanently delete your account. '
                    ."This can't be undone.",
                'code' => $this->code,
                'ttlMinutes' => $this->ttlMinutes,
                'warning' => "If you didn't ask to delete your account, ignore this email. "
                    .'Your account stays as it is, and nobody can delete it without this code.',
            ]);
    }
}
