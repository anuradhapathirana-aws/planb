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
            ->line('Your admin panel account was locked after 5 consecutive failed sign-in attempts.')
            ->action('Unlock My Account', $unlockUrl)
            ->line('This link expires in 24 hours. If you did not attempt to sign in, please contact a Super Admin.');
    }
}
