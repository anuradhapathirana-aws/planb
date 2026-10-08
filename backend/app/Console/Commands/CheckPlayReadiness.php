<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\CourseStatus;
use App\Models\CourseProgramme;
use App\Models\Payment;
use App\Models\Student;
use App\Services\Auth\PlayReviewAccess;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

/**
 * Pre-flight for a Google Play release: the settings that stay invisible until
 * a reviewer or a student hits them.
 *
 * Every item here has failed somewhere real — a reviewer who cannot sign in, a
 * deletion page with no contact on it, a queue worker that died so no sign-in
 * code ever arrives. Run it on the server after every deploy and before
 * promoting a build. It only reads.
 *
 * Checks that only make sense on a live server report as skipped elsewhere, so
 * the same command is still useful locally.
 */
class CheckPlayReadiness extends Command
{
    protected $signature = 'check:play-readiness';

    protected $description = 'Check this environment against what Google Play review and real students need';

    private const PASS = 'pass';

    private const FAIL = 'fail';

    private const SKIP = 'skip';

    /** Sequences an attacker tries first, and that tutorials hand out as examples. */
    private const WEAK_REVIEW_CODES = ['123456', '000000', '111111', '654321'];

    /** A queued sign-in code older than this means nothing is consuming the queue. */
    private const STUCK_JOB_SECONDS = 300;

    /** @var array<int, array{0: string, 1: string, 2: string}> */
    private array $results = [];

    public function handle(PlayReviewAccess $review): int
    {
        $isProduction = app()->environment('production');

        $this->environment($isProduction);
        $this->mail($isProduction);
        $this->supportAddress();
        $this->reviewerSignIn($review);
        $this->payments();
        $this->freeCourse();
        $this->legalPages();
        $this->privateDisks();
        $this->queueWorker($isProduction);

        $this->render();

        $failed = count(array_filter($this->results, fn (array $row): bool => $row[0] === self::FAIL));

        if ($failed > 0) {
            $this->newLine();
            $this->error("{$failed} check(s) failed — fix before releasing.");

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Ready for release.');

        return self::SUCCESS;
    }

    private function environment(bool $isProduction): void
    {
        if (! $isProduction) {
            $this->skip('Environment', 'APP_ENV='.app()->environment().', production-only checks skipped');

            return;
        }

        $problems = [];

        if (config('app.debug') === true) {
            $problems[] = 'APP_DEBUG is true (leaks stack traces)';
        }

        if (! str_starts_with((string) config('app.url'), 'https://')) {
            $problems[] = 'APP_URL is not https';
        }

        $problems === []
            ? $this->pass('Environment', 'production, debug off, https')
            : $this->problem('Environment', implode('; ', $problems));
    }

    private function mail(bool $isProduction): void
    {
        $driver = (string) config('mail.default');

        if (! $isProduction) {
            $this->skip('Mail driver', $driver.' (fine outside production)');

            return;
        }

        $driver === 'log'
            ? $this->problem('Mail driver', 'MAIL_MAILER=log, so no sign-in code can ever arrive')
            : $this->pass('Mail driver', $driver);
    }

    private function supportAddress(): void
    {
        $address = (string) config('legal.support_address');

        filter_var($address, FILTER_VALIDATE_EMAIL) === false
            ? $this->problem('Support address', 'missing or invalid, so the deletion page Google reads has no contact')
            : $this->pass('Support address', $address);
    }

    private function reviewerSignIn(PlayReviewAccess $review): void
    {
        if (! $review->isEnabled()) {
            $this->problem('Reviewer sign-in', 'off: set PLAY_REVIEW_EMAIL and a 6-digit PLAY_REVIEW_CODE');

            return;
        }

        if (in_array((string) config('play_review.code'), self::WEAK_REVIEW_CODES, true)) {
            $this->problem('Reviewer sign-in', 'the code is a guessable sequence, use random digits');

            return;
        }

        $this->pass('Reviewer sign-in', (string) config('play_review.email'));
    }

    private function payments(): void
    {
        config('payments.enabled') === true
            ? $this->problem('Payments', 'enabled: update the Play "financial features" form first')
            : $this->pass('Payments', 'off, so no paid dead ends for the reviewer');
    }

    /**
     * A reviewer who finds only paid, locked content reports an app that does
     * nothing. One published free course is what they are meant to land in.
     */
    private function freeCourse(): void
    {
        try {
            $free = CourseProgramme::query()
                ->where('status', CourseStatus::Published)
                ->where('price_cents', 0)
                ->count();
        } catch (Throwable $exception) {
            $this->problem('Free course', 'could not query courses: '.$exception->getMessage());

            return;
        }

        $free > 0
            ? $this->pass('Free course', $free.' published and free')
            : $this->problem('Free course', 'none, so the reviewer would see only locked content');
    }

    /** Rendered, not fetched: this has to work before the site is reachable. */
    private function legalPages(): void
    {
        $address = (string) config('legal.support_address');
        $missing = [];

        foreach (['legal.privacy', 'legal.terms', 'legal.account-deletion'] as $view) {
            try {
                $html = view($view)->render();
            } catch (Throwable $exception) {
                $this->problem('Legal pages', $view.' failed to render: '.$exception->getMessage());

                return;
            }

            // The terms page carries the contact in its footer links, not inline.
            if ($view !== 'legal.terms' && ! str_contains($html, $address)) {
                $missing[] = $view;
            }
        }

        $missing === []
            ? $this->pass('Legal pages', 'privacy, terms and deletion render with the support address')
            : $this->problem('Legal pages', 'no support address on: '.implode(', ', $missing));
    }

    /**
     * Guards the P2-2 / P2-3 fixes: receipts and student files must never drift
     * back onto a public disk, where their URLs can be walked.
     */
    private function privateDisks(): void
    {
        $expected = [
            Student::PHOTO_COLLECTION => Student::DOCUMENT_DISK,
            Student::CV_COLLECTION => Student::DOCUMENT_DISK,
            Student::PROFILE_VIDEO_COLLECTION => Student::DOCUMENT_DISK,
            Payment::RECEIPT_COLLECTION => Payment::RECEIPT_DISK,
        ];

        $problems = [];

        foreach ($expected as $collection => $disk) {
            if (config('filesystems.disks.'.$disk.'.url') !== null) {
                $problems[] = 'disk '.$disk.' has a public url';
            }

            try {
                $stray = Media::query()
                    ->where('collection_name', $collection)
                    ->where('disk', '!=', $disk)
                    ->count();
            } catch (Throwable $exception) {
                $this->problem('Private files', 'could not query media: '.$exception->getMessage());

                return;
            }

            if ($stray > 0) {
                $problems[] = $stray.' '.$collection.' file(s) not on '.$disk;
            }
        }

        $problems === []
            ? $this->pass('Private files', 'photos, CVs, videos and receipts are on private disks')
            : $this->problem('Private files', implode('; ', $problems));
    }

    /**
     * Sign-in codes are queued, so a dead worker means nobody can sign in and
     * nothing errors — the failure this app is least likely to notice itself.
     */
    private function queueWorker(bool $isProduction): void
    {
        if (config('queue.default') !== 'database') {
            $this->skip('Queue worker', 'queue is '.config('queue.default').', check the worker yourself');

            return;
        }

        try {
            $oldest = DB::table((string) config('queue.connections.database.table', 'jobs'))->min('available_at');
        } catch (Throwable $exception) {
            $this->problem('Queue worker', 'could not read the jobs table: '.$exception->getMessage());

            return;
        }

        if ($oldest === null) {
            $this->pass('Queue worker', 'no jobs waiting');

            return;
        }

        $waiting = time() - (int) $oldest;

        if ($waiting <= self::STUCK_JOB_SECONDS) {
            $this->pass('Queue worker', 'oldest job '.$waiting.'s old');

            return;
        }

        $message = 'a job has waited '.$waiting.'s, so the worker looks dead and no sign-in codes are going out';

        $isProduction ? $this->problem('Queue worker', $message) : $this->skip('Queue worker', $message);
    }

    private function pass(string $label, string $detail): void
    {
        $this->results[] = [self::PASS, $label, $detail];
    }

    private function problem(string $label, string $detail): void
    {
        $this->results[] = [self::FAIL, $label, $detail];
    }

    private function skip(string $label, string $detail): void
    {
        $this->results[] = [self::SKIP, $label, $detail];
    }

    private function render(): void
    {
        $this->newLine();

        foreach ($this->results as [$status, $label, $detail]) {
            $marker = match ($status) {
                self::PASS => '<fg=green>  OK  </>',
                self::FAIL => '<fg=red;options=bold> FAIL </>',
                default => '<fg=yellow> SKIP </>',
            };

            $this->line($marker.' '.str_pad($label, 18).' '.$detail);
        }
    }
}
