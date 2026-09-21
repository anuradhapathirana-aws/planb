<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Models\CompanySetting;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentAppConfigTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_intro_is_served_without_signing_in(): void
    {
        CompanySetting::query()->update([
            'intro_greeting_en' => 'Hello from Plan B',
            'intro_animation' => 'slide_up',
        ]);

        $this->getJson('/api/v1/student/app-config')
            ->assertOk()
            ->assertJsonPath('data.intro.enabled', true)
            ->assertJsonPath('data.intro.greeting_en', 'Hello from Plan B')
            ->assertJsonPath('data.intro.animation', 'slide_up')
            ->assertJsonPath('data.logo_url', null);
    }

    /** The sign-in screen links to these, so they come without a session too. */
    public function test_the_config_carries_the_legal_links(): void
    {
        config(['legal.support_address' => 'support@planb.test']);

        $this->getJson('/api/v1/student/app-config')
            ->assertOk()
            ->assertJsonPath('data.legal.privacy_url', route('legal.privacy'))
            ->assertJsonPath('data.legal.terms_url', route('legal.terms'))
            ->assertJsonPath('data.legal.account_deletion_url', route('legal.account-deletion'))
            ->assertJsonPath('data.legal.support_email', 'support@planb.test');
    }

    /** Read before sign-in, so an outdated app can be stopped at the launch gate. */
    public function test_the_config_carries_the_app_versions_for_both_platforms(): void
    {
        config([
            'mobile_app.android.min_version' => '1.1.0',
            'mobile_app.android.latest_version' => '1.3.0',
            'mobile_app.android.store_url' => 'https://play.google.com/store/apps/details?id=test',
            'mobile_app.ios.store_url' => null,
        ]);

        $this->getJson('/api/v1/student/app-config')
            ->assertOk()
            ->assertJsonPath('data.app_version.android.min_version', '1.1.0')
            ->assertJsonPath('data.app_version.android.latest_version', '1.3.0')
            ->assertJsonPath('data.app_version.android.store_url', 'https://play.google.com/store/apps/details?id=test')
            ->assertJsonPath('data.app_version.ios.store_url', null);
    }

    /** A blank .env line must read as "not set", not as an empty version string. */
    public function test_a_blank_app_version_is_sent_as_null(): void
    {
        config(['mobile_app.android.min_version' => '  ']);

        $this->getJson('/api/v1/student/app-config')
            ->assertOk()
            ->assertJsonPath('data.app_version.android.min_version', null);
    }

    public function test_the_public_config_never_carries_bank_details(): void
    {
        CompanySetting::query()->update(['bank_account_number' => '123456789']);

        $response = $this->getJson('/api/v1/student/app-config')->assertOk();

        $this->assertStringNotContainsString('123456789', $response->getContent() ?: '');
    }

    public function test_bank_details_come_from_the_admin_settings(): void
    {
        CompanySetting::query()->update([
            'bank_name' => 'Sampath Bank',
            'bank_account_name' => 'Plan B International',
            'bank_account_number' => '0001 2222',
            'bank_notes' => 'Add your name as the reference.',
        ]);

        Sanctum::actingAs(Student::factory()->create(['is_blocked' => false]), ['student'], 'student');

        $this->getJson('/api/v1/student/payment-methods/bank-transfer')
            ->assertOk()
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.account.bank_name', 'Sampath Bank')
            ->assertJsonPath('data.account.account_number', '0001 2222')
            ->assertJsonPath('data.account.notes', 'Add your name as the reference.');
    }

    public function test_bank_details_still_need_a_signed_in_student(): void
    {
        $this->getJson('/api/v1/student/payment-methods/bank-transfer')->assertUnauthorized();
    }
}
