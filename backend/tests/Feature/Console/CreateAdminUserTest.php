<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CreateAdminUserTest extends TestCase
{
    use RefreshDatabase;

    private const BREACH_API = 'api.pwnedpasswords.com/range/*';

    /** What the fake breach API answers. Empty: no password is known to have leaked. */
    private string $breachBody = '';

    private int $breachStatus = 200;

    protected function setUp(): void
    {
        parent::setUp();

        // No real call to Have I Been Pwned from the suite. A closure, because
        // a second Http::fake() in a test would not replace this one.
        Http::preventStrayRequests();
        Http::fake([self::BREACH_API => fn () => Http::response($this->breachBody, $this->breachStatus)]);
    }

    public function test_a_password_found_in_a_data_breach_is_refused(): void
    {
        $password = 'a-long-but-leaked-password';
        $hash = strtoupper(sha1($password));

        // The range API answers with hash suffixes and how often each has leaked.
        $this->breachBody = substr($hash, 5).":4521\r\n0000000000000000000000000000000000A:1";

        $this->artisan('admin:create', ['--name' => 'Test', '--email' => 'new@planb.lk', '--role' => RoleName::SuperAdmin->value])
            ->expectsQuestion('Password', $password)
            ->expectsQuestion('Type the password again', $password)
            ->assertFailed();

        $this->assertDatabaseCount('users', 0);

        // Only the 5-character prefix is sent, never the password or full hash.
        Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/range/'.substr($hash, 0, 5)));
    }

    /** A firewalled server must still be able to create its first admin. */
    public function test_an_unreachable_breach_service_does_not_block_creation(): void
    {
        $this->breachStatus = 503;

        $this->artisan('admin:create', ['--name' => 'Test', '--email' => 'new@planb.lk', '--role' => RoleName::SuperAdmin->value])
            ->expectsQuestion('Password', 'a-long-enough-password')
            ->expectsQuestion('Type the password again', 'a-long-enough-password')
            ->assertSuccessful();
    }

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
