<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\RoleName;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoStudentAppSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\StudentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * `AdminUserSeeder` writes admin accounts whose password is in this repository.
 * These prove no seeder that creates logins or fake people can run on a server,
 * however it is invoked.
 */
class ProductionSeedingTest extends TestCase
{
    use RefreshDatabase;

    private function runningIn(string $environment): void
    {
        $this->app['env'] = $environment;
    }

    /** Runs `db:seed` the way someone on the server would, and returns what it threw. */
    private function runSeed(?string $class = null): ?RuntimeException
    {
        try {
            Artisan::call('db:seed', array_filter(['--class' => $class, '--force' => true]));
        } catch (RuntimeException $exception) {
            return $exception;
        }

        return null;
    }

    public function test_the_full_seed_refuses_in_production_and_writes_nothing(): void
    {
        $this->runningIn('production');

        $exception = $this->runSeed();

        $this->assertNotNull($exception, 'db:seed must refuse to run in production.');
        $this->assertStringContainsString('admin:create', $exception->getMessage());

        $this->assertSame(0, User::count());
        $this->assertSame(0, Student::count());
        // Stopped before the first seeder, not halfway through.
        $this->assertSame(0, Role::count());
    }

    public function test_it_refuses_on_staging_too(): void
    {
        $this->runningIn('staging');

        $this->assertNotNull($this->runSeed());
        $this->assertSame(0, User::count());
    }

    public function test_seeders_that_create_logins_or_fake_students_refuse_when_called_by_name(): void
    {
        $this->runningIn('production');

        foreach ([AdminUserSeeder::class, StudentSeeder::class, DemoStudentAppSeeder::class] as $seeder) {
            $this->assertNotNull($this->runSeed($seeder), "{$seeder} ran in production.");
        }

        $this->assertSame(0, User::count());
        $this->assertSame(0, Student::count());
    }

    /** What docs/deployment.md tells a server to run. */
    public function test_roles_can_still_be_seeded_in_production(): void
    {
        $this->runningIn('production');

        $this->assertNull($this->runSeed(RoleSeeder::class));
        $this->assertTrue(Role::where('name', RoleName::SuperAdmin->value)->exists());
    }

    public function test_the_full_seed_still_works_locally(): void
    {
        $this->runningIn('local');

        $this->assertNull($this->runSeed(DatabaseSeeder::class));
        $this->assertTrue(User::where('email', 'admin@planbinternational.test')->exists());
        $this->assertGreaterThan(0, Student::count());
    }
}
