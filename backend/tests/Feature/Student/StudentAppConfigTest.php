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
