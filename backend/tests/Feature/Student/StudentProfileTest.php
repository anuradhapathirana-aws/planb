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
            'contact_number' => '0771234567',
            'industry_id' => $profession->industry_id,
            'profession_id' => $profession->id,
            'languages_spoken' => ['Sinhala', 'English'],
        ])
            ->assertOk()
            ->assertJsonPath('data.address', '12 Galle Road, Colombo')
            ->assertJsonPath('data.profession.id', $profession->id);
    }

    /**
     * Email is the credential. Letting it be changed here would let anyone with a
     * live token move the account to an address they control.
     */
    public function test_email_and_identity_fields_cannot_be_changed(): void
    {
        $this->putJson('/api/v1/student/profile', [
            'email' => 'attacker@example.com',
            'full_name' => 'Someone Else',
            'student_id' => 'PB-00001',
            'visa_status' => 'employment',
            'is_blocked' => true,
            'registered_at' => now()->toIso8601String(),
        ])->assertOk();

        $this->student->refresh();

        $this->assertSame('nimal@example.com', $this->student->email);
        $this->assertSame('Nimal Perera', $this->student->full_name);
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

    public function test_the_profile_endpoints_require_authentication(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/student/profile')->assertUnauthorized();
        $this->putJson('/api/v1/student/profile', [])->assertUnauthorized();
    }
}
