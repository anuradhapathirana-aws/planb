<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Student;
use App\Models\StudentLoginCode;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Prints the live sign-in code for a student, for local testing.
 *
 * Codes are stored hashed and are never recoverable from the database, so this
 * recovers the plaintext from the rendered mail in the log — which only exists
 * because MAIL_MAILER=log locally.
 *
 * Refuses to run outside local/testing. A command that prints a live credential
 * has no business existing on a server that sends real email.
 */
class ShowStudentLoginCode extends Command
{
    protected $signature = 'student:code {email=student@planb.test}';

    protected $description = 'Show the current sign-in code for a student (local development only)';

    public function handle(): int
    {
        if (! app()->environment('local', 'testing')) {
            $this->error('Refusing to run outside local/testing — this prints a live credential.');

            return self::FAILURE;
        }

        if (config('mail.default') !== 'log') {
            $this->error('MAIL_MAILER is not "log", so codes are not written to the log file.');

            return self::FAILURE;
        }

        $email = (string) $this->argument('email');
        $student = Student::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first();

        if (! $student) {
            $this->error("No student with the email {$email}.");

            return self::FAILURE;
        }

        $live = StudentLoginCode::where('student_id', $student->id)
            ->whereNull('consumed_at')
            ->whereNull('voided_at')
            ->latest('id')
            ->first();

        if (! $live) {
            $this->warn('No live code. Tap "Email me a sign-in code" in the app first.');

            return self::FAILURE;
        }

        if ($live->expires_at->isPast()) {
            $this->warn('The latest code has expired. Request a new one in the app.');

            return self::FAILURE;
        }

        // Match the hash against the codes in the log rather than trusting the
        // last line — a resend writes a new entry and the ordering can mislead.
        $logPath = storage_path('logs/laravel.log');

        if (! is_file($logPath)) {
            $this->error('No log file yet.');

            return self::FAILURE;
        }

        preg_match_all('/<strong[^>]*>(\d{6})<\/strong>/', (string) file_get_contents($logPath), $matches);

        foreach (array_reverse(array_unique($matches[1] ?? [])) as $candidate) {
            if (Hash::check($candidate, $live->code_hash)) {
                $this->newLine();
                $this->line("  Sign-in code for <options=bold>{$email}</>");
                $this->line("  <fg=black;bg=yellow;options=bold>  {$candidate}  </>");
                $this->line('  expires '.$live->expires_at->diffForHumans());
                $this->newLine();

                return self::SUCCESS;
            }
        }

        $this->error('Could not find the current code in the log. Request a new one in the app.');

        return self::FAILURE;
    }
}
