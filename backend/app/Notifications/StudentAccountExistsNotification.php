<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Someone tried to sign up with an address that already has an account.
 *
 * This email is how the anti-enumeration rule stays kind: the sign-up screen
 * cannot say "you already have an account" without telling a stranger the same
 * thing (backend/CLAUDE.md §4), so the mailbox owner hears it here instead.
 * It carries no code and no link — there is nothing in it worth stealing.
 */
class StudentAccountExistsNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('You already have a Plan B account')
            ->view(['emails.notice', 'emails.notice-text'], [
                'preheader' => 'Sign in with this email address instead.',
                'heading' => 'You already have an account',
                'lines' => [
                    'Someone just tried to create a new Plan B account with this email address. '
                        .'There is already an account for it, so no new one was made.',
                    'To get back in, open the Plan B app or website, choose Sign in, and enter this '
                        .'email address. We will send you a sign-in code.',
                ],
                'footnote' => "If this wasn't you, you can ignore this email. Your account has not changed.",
            ]);
    }
}
