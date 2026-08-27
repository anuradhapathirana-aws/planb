<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Models\Industry;
use App\Models\Profession;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentProfileTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = Student::factory()->create([
            'is_blocked' => false,
            'email' => 'nimal@example.com',
            'full_name' => 'Nimal Perera',
        ]);

        Sanctum::actingAs($this->student, ['student'], 'student');
    }

    public function test_a_student_can_read_their_own_profile(): void
    {
        $this->getJson('/api/v1/student/profile')
            ->assertOk()
            ->assertJsonPath('data.student_id', $this->student->student_id)
            ->assertJsonPath('data.email', 'nimal@example.com');
    }

    public function test_a_student_can_update_the_editable_fields(): void
    {
        $profession = Profession::factory()->create();

        $this->putJson('/api/v1/student/profile', [
            'address' => '12 Galle Road, Colombo',
            'highest_qualification' => 'Diploma',
            'industry_id' => $profession->industry_id,
            'profession_id' => $profession->id,
            'languages_spoken' => ['Sinhala', 'English'],
        ])
            ->assertOk()
            ->assertJsonPath('data.address', '12 Galle Road, Colombo')
            ->assertJsonPath('data.profession.id', $profession->id);
    }

    /** Name and visa status are student-editable, at the client's request. */
    public function test_a_student_can_update_their_name_and_visa_status(): void
    {
        $this->putJson('/api/v1/student/profile', [
            'full_name' => 'Nimal Bandara Perera',
            'visa_status' => 'employment',
        ])
            ->assertOk()
            ->assertJsonPath('data.full_name', 'Nimal Bandara Perera')
            ->assertJsonPath('data.visa_status', 'employment');
    }

    public function test_visa_status_must_be_a_known_value(): void
    {
        $this->putJson('/api/v1/student/profile', ['visa_status' => 'permanent-residency'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('visa_status');
    }

    public function test_full_name_cannot_be_blanked(): void
    {
        $this->putJson('/api/v1/student/profile', ['full_name' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('full_name');
    }

    /**
     * Email is the sign-in credential, and the phone number is changed only by
     * proving control of the new one over SMS. Neither may be written here —
     * silently ignored rather than rejected, since the client never sends them.
     */
    public function test_credential_fields_cannot_be_changed_through_the_profile(): void
    {
        $this->putJson('/api/v1/student/profile', [
            'email' => 'attacker@example.com',
            'contact_number' => '0770000000',
            'student_id' => 'PB-99999',
            'is_blocked' => true,
            'registered_at' => now()->toIso8601String(),
        ])->assertOk();

        $this->student->refresh();

        $this->assertSame('nimal@example.com', $this->student->email);
        $this->assertNotSame('0770000000', $this->student->contact_number);
        $this->assertNotSame('PB-99999', $this->student->student_id);
        $this->assertFalse($this->student->is_blocked);
    }

    public function test_a_profession_must_belong_to_the_chosen_industry(): void
    {
        $profession = Profession::factory()->create();
        $otherIndustry = Industry::factory()->create();

        $this->putJson('/api/v1/student/profile', [
            'industry_id' => $otherIndustry->id,
            'profession_id' => $profession->id,
        ])->assertStatus(422)->assertJsonValidationErrors('profession_id');
    }

    public function test_the_minimum_age_rule_applies(): void
    {
        $this->putJson('/api/v1/student/profile', [
            'date_of_birth' => now()->subYears(15)->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('date_of_birth');
    }

    public function test_a_student_can_upload_and_remove_their_photo(): void
    {
        Storage::fake('public');

        $this->postJson('/api/v1/student/profile/photo', [
            'photo' => UploadedFile::fake()->image('me.jpg', 800, 800),
        ])->assertOk();

        $this->assertNotNull($this->student->fresh()->getFirstMedia('profile_photo'));

        $this->deleteJson('/api/v1/student/profile/photo')->assertOk();

        $this->assertNull($this->student->fresh()->getFirstMedia('profile_photo'));
    }

    public function test_a_non_image_upload_is_rejected(): void
    {
        Storage::fake('public');

        $this->postJson('/api/v1/student/profile/photo', [
            'photo' => UploadedFile::fake()->create('payload.pdf', 100, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('photo');
    }

    public function test_reference_lists_are_available_and_active_only(): void
    {
        $active = Profession::factory()->create();
        $inactive = Profession::factory()->create(['is_active' => false]);

        $this->getJson('/api/v1/student/industries')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name']]]);

        $response = $this->getJson('/api/v1/student/professions')->assertOk();

        $ids = array_column($response->json('data'), 'id');

        $this->assertContains($active->id, $ids);
        $this->assertNotContains($inactive->id, $ids, 'A retired profession must not be offered.');

        // Internal bookkeeping the student has no use for.
        $this->assertStringNotContainsString('is_active', $response->getContent());
    }

    public function test_the_profile_endpoints_require_authentication(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/student/profile')->assertUnauthorized();
        $this->putJson('/api/v1/student/profile', [])->assertUnauthorized();
    }
}
