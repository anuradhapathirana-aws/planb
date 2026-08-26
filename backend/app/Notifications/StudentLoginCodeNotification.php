<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The one-time code a student uses to sign in to the mobile app.
 *
 * Queued, per CLAUDE.md §4.7 — which makes a running `queue:work` a hard
 * dependency of signing in at all (backend/CLAUDE.md §6).
 *
 * The plaintext code is serialised into the `jobs` table for the seconds it is
 * queued. That is acceptable for a credential this short-lived, but it is why
 * failed jobs must be pruned rather than left to accumulate.
 */
class StudentLoginCodeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        private readonly string $code,
        private readonly int $ttlMinutes,
    ) {}

    /**
     * A code is worthless once it expires, so there is no point retrying into a
     * dead window — fail the job instead and let the student request another.
     */
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
        return (new MailMessage)
            ->subject('Your Plan B sign-in code')
            ->greeting('Your sign-in code')
            ->line('Enter this code in the Plan B app:')
            ->line('**'.$this->code.'**')
            ->line("This code expires in {$this->ttlMinutes} minutes and can be used once.")
            ->line('If you did not try to sign in, you can ignore this email — nobody can '
                .'access your account without the code.');
    }
}
