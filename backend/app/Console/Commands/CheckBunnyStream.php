<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Course\BunnyStreamClient;
use Illuminate\Console\Command;

/**
 * "Are the Bunny settings on this server right?" — answered before an admin
 * finds out by getting an error mid-upload.
 *
 * Prints pass/fail and a hint per check and never a key, so the output is safe
 * to paste into a chat or a ticket.
 */
class CheckBunnyStream extends Command
{
    protected $signature = 'bunny:check';

    protected $description = 'Check the Bunny Stream settings against Bunny itself';

    public function handle(BunnyStreamClient $bunny): int
    {
        $this->newLine();

        $failed = 0;

        foreach ($bunny->diagnostics() as $check) {
            if (! $check['passed']) {
                $failed++;
            }

            $this->line(sprintf(
                '  <fg=%s>%s</>  %s%s',
                $check['passed'] ? 'green' : 'red',
                $check['passed'] ? 'PASS' : 'FAIL',
                $check['label'],
                $check['detail'] === '' ? '' : " <fg=gray>({$check['detail']})</>",
            ));
        }

        $this->newLine();

        if ($failed === 0) {
            $this->info('All checks passed.');

            return self::SUCCESS;
        }

        $this->error("{$failed} check(s) failed. See docs/bunny-stream-setup.md, Part 2.");
        $this->line('Remember `php artisan config:cache` after editing .env.');

        return self::FAILURE;
    }
}
