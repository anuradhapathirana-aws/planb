<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class AdminAccountLockedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $unlockUrl = URL::temporarySignedRoute(
            'admin.unlock',
            now()->addHours(24),
            ['user' => $notifiable->getKey()],
        );

        return (new MailMessage)
            ->subject('Your Plan B Admin Account Has Been Locked')
            ->view(['emails.action', 'emails.action-text'], [
                'preheader' => 'Your admin account was locked after 5 failed sign-in attempts.',
                'heading' => 'Your admin account is locked',
                'lines' => [
                    'Your admin panel account was locked after 5 failed sign-in attempts in a row.',
                ],
                'actionText' => 'Unlock my account',
                'actionUrl' => $unlockUrl,
                'outroLines' => [
                    'This link expires in 24 hours.',
                    "If you didn't try to sign in, someone may be guessing your password. "
                        .'Tell a Super Admin before unlocking.',
                ],
            ]);
    }
}
