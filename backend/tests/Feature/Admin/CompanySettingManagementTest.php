<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CompanySettingManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    private function actingAsRole(RoleName $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role->value);

        $this->actingAs($user);

        return $user;
    }

    /** @return array<string, mixed> */
    private function bankPayload(array $overrides = []): array
    {
        return array_merge([
            'bank_transfer_enabled' => true,
            'bank_name' => 'Commercial Bank of Ceylon',
            'bank_account_name' => 'Plan B International (Pvt) Ltd',
            'bank_account_number' => '8001 2345 6789',
            'bank_branch' => 'Colombo 03',
            'bank_notes' => 'Use your student ID as the reference.',
        ], $overrides);
    }

    /** @return array<string, mixed> */
    private function introPayload(array $overrides = []): array
    {
        return array_merge([
            'intro_is_enabled' => true,
            'intro_greeting_en' => 'Welcome to Plan B',
            'intro_greeting_si' => 'Plan B වෙත සාදරයෙන් පිළිගනිමු',
            'intro_animation' => 'zoom',
        ], $overrides);
    }

    public function test_settings_exist_from_the_start(): void
    {
        $this->actingAsRole(RoleName::SupportAgent);

        $this->getJson('/api/v1/admin/company-settings')
            ->assertOk()
            ->assertJsonPath('data.bank_transfer_enabled', true)
            ->assertJsonPath('data.intro_animation', 'fade');
    }

    public function test_a_super_admin_saves_the_bank_details(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->putJson('/api/v1/admin/company-settings/bank-details', $this->bankPayload())
            ->assertOk()
            ->assertJsonPath('data.bank_account_number', '8001 2345 6789')
            ->assertJsonPath('data.bank_notes', 'Use your student ID as the reference.');

        $this->assertDatabaseHas('company_settings', ['bank_name' => 'Commercial Bank of Ceylon']);
        $this->assertDatabaseCount('company_settings', 1);
    }

    public function test_a_content_manager_cannot_change_the_bank_account(): void
    {
        $this->actingAsRole(RoleName::ContentManager);

        $this->putJson('/api/v1/admin/company-settings/bank-details', $this->bankPayload())
            ->assertForbidden();
    }

    public function test_bank_transfer_cannot_be_switched_on_without_an_account(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->putJson('/api/v1/admin/company-settings/bank-details', $this->bankPayload([
            'bank_name' => '',
            'bank_account_number' => null,
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['bank_name', 'bank_account_number']);
    }

    public function test_bank_transfer_can_be_switched_off_with_the_fields_blank(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->putJson('/api/v1/admin/company-settings/bank-details', $this->bankPayload([
            'bank_transfer_enabled' => false,
            'bank_name' => null,
            'bank_account_name' => null,
            'bank_account_number' => null,
        ]))
            ->assertOk()
            ->assertJsonPath('data.bank_transfer_enabled', false);
    }

    public function test_a_content_manager_saves_the_app_intro(): void
    {
        $this->actingAsRole(RoleName::ContentManager);

        $this->putJson('/api/v1/admin/company-settings/app-intro', $this->introPayload())
            ->assertOk()
            ->assertJsonPath('data.intro_greeting_en', 'Welcome to Plan B')
            ->assertJsonPath('data.intro_animation', 'zoom');
    }

    public function test_an_unknown_animation_is_rejected(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->putJson('/api/v1/admin/company-settings/app-intro', $this->introPayload([
            'intro_animation' => 'spin',
            'intro_greeting_en' => '',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['intro_animation', 'intro_greeting_en']);
    }

    public function test_the_logo_is_uploaded_re_encoded_and_removed(): void
    {
        Storage::fake('public');
        $this->actingAsRole(RoleName::SuperAdmin);

        $url = $this->post('/api/v1/admin/company-settings/logo', [
            'logo' => UploadedFile::fake()->image('logo.jpg', 900, 900),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('data.logo_url');

        $this->assertIsString($url);
        $this->assertStringEndsWith('logo.png', $url);

        $this->getJson('/api/v1/admin/branding')->assertOk()->assertJsonPath('data.logo_url', $url);

        $this->deleteJson('/api/v1/admin/company-settings/logo')
            ->assertOk()
            ->assertJsonPath('data.logo_url', null);
    }

    public function test_a_non_image_logo_is_rejected(): void
    {
        $this->actingAsRole(RoleName::SuperAdmin);

        $this->post('/api/v1/admin/company-settings/logo', [
            'logo' => UploadedFile::fake()->create('logo.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('logo');
    }

    public function test_a_guest_cannot_read_the_settings(): void
    {
        $this->getJson('/api/v1/admin/company-settings')->assertUnauthorized();
    }
}
