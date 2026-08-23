<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => RoleName::SuperAdmin->value, 'guard_name' => 'web']);
    }

    public function test_admin_can_log_in_with_correct_credentials(): void
    {
        $user = User::factory()->create(['password' => 'CorrectPass1!']);
        $user->assignRole(RoleName::SuperAdmin->value);

        $response = $this->withHeader('Referer', 'http://localhost:5173')
            ->postJson('/api/v1/admin/login', [
                'email' => $user->email,
                'password' => 'CorrectPass1!',
            ]);

        $response->assertOk()->assertJsonPath('data.email', $user->email);
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_fails_with_incorrect_password(): void
    {
        $user = User::factory()->create(['password' => 'CorrectPass1!']);

        $response = $this->postJson('/api/v1/admin/login', [
            'email' => $user->email,
            'password' => 'WrongPassword!',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertGuest();
    }

    public function test_account_locks_after_five_failed_attempts(): void
    {
        Notification::fake();

        $user = User::factory()->create(['password' => 'CorrectPass1!']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/admin/login', [
                'email' => $user->email,
                'password' => 'WrongPassword!',
            ]);
        }

        $user->refresh();
        $this->assertTrue($user->isLocked());

        // Even the correct password is now rejected.
        $response = $this->postJson('/api/v1/admin/login', [
            'email' => $user->email,
            'password' => 'CorrectPass1!',
        ]);
        $response->assertUnprocessable();
    }

    public function test_authenticated_admin_can_fetch_me(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleName::SuperAdmin->value);

        $response = $this->actingAs($user)->getJson('/api/v1/admin/me');

        $response->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_guest_cannot_fetch_me(): void
    {
        $this->getJson('/api/v1/admin/me')->assertUnauthorized();
    }
}
