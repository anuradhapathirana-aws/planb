<?php

declare(strict_types=1);

namespace Database\Seeders\Concerns;

use RuntimeException;

/**
 * For seeders that write known logins or fake people.
 *
 * `AdminUserSeeder` creates four admin accounts whose password is published in
 * this repository, and the student seeders invent people with real-looking
 * details. Either one on a live server is a breach waiting to be noticed, so
 * they refuse to run anywhere but a developer's machine or the test suite —
 * whether reached through `db:seed` or `db:seed --class=...`.
 *
 * Reference data (`RoleSeeder`, `IndustrySeeder`, `HomeCarouselSeeder`) does not
 * use this and stays safe to seed on a server.
 */
trait LocalOnly
{
    protected function ensureLocalEnvironment(): void
    {
        if (app()->environment('local', 'testing')) {
            return;
        }

        throw new RuntimeException(sprintf(
            '%s only runs locally: it creates known logins or fake students (APP_ENV is "%s"). '
            .'On a server, seed roles with `php artisan db:seed --class=RoleSeeder --force`, '
            .'then create a real admin with `php artisan admin:create`.',
            class_basename(static::class),
            app()->environment(),
        ));
    }
}
