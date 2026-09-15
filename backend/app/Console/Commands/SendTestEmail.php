<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Notifications\StudentLoginCodeNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;
use Throwable;

/**
 * Sends one sample Plan B email, to check the SMTP settings in `.env`.
 *
 * Sent immediately rather than queued, so a wrong host, port or password shows
 * up here as an error instead of as a failed job nobody is watching. The code
 * in it is a fixed dummy value and signs nobody in.
 */
class SendTestEmail extends Command
{
    protected $signature = 'mail:test {email : Where to send the sample email}';

    protected $description = 'Send a sample branded email to check the mail settings';

    public function handle(): int
    {
        $email = (string) $this->argument('email');

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $this->error('That is not a valid email address.');

            return self::FAILURE;
        }

        $mailer = (string) config('mail.default');

        $this->line("Mailer: <options=bold>{$mailer}</>");

        if ($mailer === 'smtp') {
            $this->line('Host:   '.config('mail.mailers.smtp.host').':'.config('mail.mailers.smtp.port')
                .' ('.(config('mail.mailers.smtp.scheme') ?: 'auto').')');
        }

        $this->line('From:   '.config('mail.from.name').' <'.config('mail.from.address').'>');

        try {
            Notification::route('mail', $email)
                ->notifyNow(new StudentLoginCodeNotification('000000', 10));
        } catch (Throwable $exception) {
            // The transport's own message is what tells you which setting is wrong
            // (auth failed, connection refused, certificate mismatch). It never
            // contains the password.
            $this->error('Sending failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        if ($mailer === 'log') {
            $this->warn('MAIL_MAILER=log: nothing was sent. The email was written to storage/logs/laravel.log.');

            return self::SUCCESS;
        }

        $this->info("Sent. Check {$email}, including the spam folder.");

        return self::SUCCESS;
    }
}
