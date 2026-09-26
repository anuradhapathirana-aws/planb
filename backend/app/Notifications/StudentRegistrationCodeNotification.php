<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The code that finishes signing up with an email address.
 *
 * Sent on demand (`Notification::route('mail', ...)`) because there is no
 * student yet — the record is created only once this code comes back. Queued
 * like the sign-in code, with the same short-lived-credential caveats (see
 * StudentLoginCodeNotification).
 */
class StudentRegistrationCodeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public readonly string $code,
        private readonly int $ttlMinutes,
    ) {}

    /** A code is worthless once it expires, so never retry into a dead window. */
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
        // The code stays out of the subject and preheader, which show on a locked phone.
        return (new MailMessage)
            ->subject('Confirm your email for Plan B')
            ->view(['emails.code', 'emails.code-text'], [
                'preheader' => 'One step left to create your Plan B account.',
                'heading' => 'Confirm your email',
                'intro' => 'Enter this code to finish creating your Plan B account:',
                'code' => $this->code,
                'ttlMinutes' => $this->ttlMinutes,
                'warning' => "If you didn't try to create a Plan B account, you can ignore this email. "
                    .'No account is created without this code.',
            ]);
    }
}
