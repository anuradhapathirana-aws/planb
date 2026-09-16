<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateAdminUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_super_admin_who_can_actually_sign_in(): void
    {
        $this->artisan('admin:create', [
            '--name' => 'Anuradha Pathirana',
            '--email' => 'Anuradha@PlanB.LK',
            '--role' => RoleName::SuperAdmin->value,
        ])
            ->expectsQuestion('Password', 'a-long-enough-password')
            ->expectsQuestion('Type the password again', 'a-long-enough-password')
            ->assertSuccessful();

        // Emails are lowercased: sign-in must not depend on how it was typed here.
        $user = User::where('email', 'anuradha@planb.lk')->sole();

        $this->assertTrue($user->hasRole(RoleName::SuperAdmin->value));
        $this->assertTrue(Hash::check('a-long-enough-password', $user->password));
        $this->assertNotSame('a-long-enough-password', $user->password);
    }

    public function test_a_short_password_is_refused(): void
    {
        $this->artisan('admin:create', ['--name' => 'Test', '--email' => 'new@planb.lk', '--role' => RoleName::SuperAdmin->value])
            ->expectsQuestion('Password', 'short')
            ->expectsQuestion('Type the password again', 'short')
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }

    public function test_mistyped_confirmation_creates_nobody(): void
    {
        $this->artisan('admin:create', ['--name' => 'Test', '--email' => 'new@planb.lk', '--role' => RoleName::SuperAdmin->value])
            ->expectsQuestion('Password', 'a-long-enough-password')
            ->expectsQuestion('Type the password again', 'a-long-enough-passwerd')
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);
    }

    public function test_an_existing_email_is_refused_rather_than_overwritten(): void
    {
        $existing = User::factory()->create(['email' => 'taken@planb.lk']);

        $this->artisan('admin:create', ['--name' => 'Someone Else', '--email' => 'taken@planb.lk', '--role' => RoleName::SuperAdmin->value])
            ->expectsQuestion('Password', 'a-long-enough-password')
            ->expectsQuestion('Type the password again', 'a-long-enough-password')
            ->assertFailed();

        $this->assertSame($existing->name, $existing->fresh()->name);
    }
}
