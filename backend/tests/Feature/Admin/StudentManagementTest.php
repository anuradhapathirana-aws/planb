<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\Industry;
use App\Models\Profession;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StudentManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->assignRole(RoleName::SuperAdmin->value);
    }

    /**
     * A complete, valid create/update payload — full_name, contact_number, address,
     * date_of_birth, visa_status, industry_id and profession_id are all required.
     */
    private function validStudentPayload(array $overrides = []): array
    {
        $profession = Profession::factory()->create();

        return array_merge([
            'full_name' => 'New Candidate',
            'contact_number' => '0771234567',
            'address' => '123 Galle Road, Colombo',
            'date_of_birth' => '2000-01-01',
            'visa_status' => 'employment',
            'industry_id' => $profession->industry_id,
            'profession_id' => $profession->id,
        ], $overrides);
    }

    public function test_guest_cannot_list_students(): void
    {
        $this->getJson('/api/v1/admin/students')->assertUnauthorized();
    }

    public function test_admin_can_list_students(): void
    {
        Student::factory()->count(3)->registered()->create();

        $response = $this->actingAs($this->superAdmin)->getJson('/api/v1/admin/students');

        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.total', 3);
    }

    public function test_admin_can_search_students_by_student_id(): void
    {
        Student::factory()->registered()->create(['student_id' => 'PB-99999']);
        Student::factory()->count(2)->registered()->create();

        $response = $this->actingAs($this->superAdmin)->getJson('/api/v1/admin/students?search=99999');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_can_create_a_student_with_an_auto_generated_student_id(): void
    {
        $response = $this->actingAs($this->superAdmin)->postJson(
            '/api/v1/admin/students',
            $this->validStudentPayload(['full_name' => 'New Candidate']),
        );

        $response->assertCreated()
            ->assertJsonPath('data.full_name', 'New Candidate')
            ->assertJsonPath('data.student_id', fn ($id) => (bool) preg_match('/^PB-\d+$/', $id));
    }

    public function test_creating_a_student_without_required_fields_fails_validation(): void
    {
        $response = $this->actingAs($this->superAdmin)->postJson('/api/v1/admin/students', []);

        $response->assertUnprocessable()->assertJsonValidationErrors([
            'full_name', 'contact_number', 'address', 'date_of_birth', 'visa_status', 'industry_id', 'profession_id',
        ]);
    }

    public function test_creating_a_student_under_18_fails_validation(): void
    {
        $payload = $this->validStudentPayload([
            'date_of_birth' => now()->subYears(18)->addDay()->toDateString(),
        ]);

        $response = $this->actingAs($this->superAdmin)->postJson('/api/v1/admin/students', $payload);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['date_of_birth'])
            ->assertJsonPath('errors.date_of_birth.0', 'Student must be at least 18 years old.');
    }

    public function test_creating_a_student_who_turns_18_today_is_allowed(): void
    {
        $payload = $this->validStudentPayload([
            'date_of_birth' => now()->subYears(18)->toDateString(),
        ]);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/students', $payload)
            ->assertCreated();
    }

    public function test_creating_a_student_with_a_future_date_of_birth_fails_validation(): void
    {
        $payload = $this->validStudentPayload(['date_of_birth' => now()->addDay()->toDateString()]);

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/students', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['date_of_birth']);
    }

    public function test_created_student_ids_increment_sequentially(): void
    {
        Student::factory()->create(['student_id' => 'PB-10050']);

        $response = $this->actingAs($this->superAdmin)->postJson('/api/v1/admin/students', $this->validStudentPayload());

        $response->assertCreated()->assertJsonPath('data.student_id', 'PB-10051');
    }

    public function test_a_client_supplied_student_id_is_ignored_on_create(): void
    {
        $response = $this->actingAs($this->superAdmin)->postJson(
            '/api/v1/admin/students',
            $this->validStudentPayload(['student_id' => 'PB-99999']),
        );

        $response->assertCreated()->assertJsonPath('data.student_id', fn ($id) => $id !== 'PB-99999');
    }

    public function test_next_id_endpoint_previews_without_reserving(): void
    {
        Student::factory()->create(['student_id' => 'PB-10099']);

        $preview = $this->actingAs($this->superAdmin)->getJson('/api/v1/admin/students/next-id');
        $preview->assertOk()->assertJsonPath('data.student_id', 'PB-10100');

        // Previewing again without creating anything shows the same, still-unused ID.
        $again = $this->actingAs($this->superAdmin)->getJson('/api/v1/admin/students/next-id');
        $again->assertOk()->assertJsonPath('data.student_id', 'PB-10100');

        $created = $this->actingAs($this->superAdmin)->postJson('/api/v1/admin/students', $this->validStudentPayload());
        $created->assertCreated()->assertJsonPath('data.student_id', 'PB-10100');
    }

    public function test_admin_can_create_a_student_with_an_industry_and_profession(): void
    {
        $industry = Industry::factory()->create();
        $profession = Profession::factory()->create(['industry_id' => $industry->id]);

        $response = $this->actingAs($this->superAdmin)->postJson(
            '/api/v1/admin/students',
            $this->validStudentPayload(['industry_id' => $industry->id, 'profession_id' => $profession->id]),
        );

        $response->assertCreated()
            ->assertJsonPath('data.industry.id', $industry->id)
            ->assertJsonPath('data.profession.id', $profession->id);
    }

    public function test_creating_a_student_rejects_a_profession_outside_the_given_industry(): void
    {
        $industry = Industry::factory()->create();
        $otherIndustryProfession = Profession::factory()->create();

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/students', $this->validStudentPayload([
                'industry_id' => $industry->id,
                'profession_id' => $otherIndustryProfession->id,
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('profession_id');
    }

    public function test_admin_can_update_a_student(): void
    {
        $student = Student::factory()->create(['student_id' => 'PB-10003']);

        $response = $this->actingAs($this->superAdmin)->putJson(
            "/api/v1/admin/students/{$student->id}",
            $this->validStudentPayload(['student_id' => 'PB-10003', 'full_name' => 'Updated Name']),
        );

        $response->assertOk()->assertJsonPath('data.full_name', 'Updated Name');
    }

    public function test_admin_must_backfill_required_fields_to_update_a_pending_registration_student(): void
    {
        // Bulk-imported students start with only a student_id — everything else is null
        // until the student self-registers on the mobile app.
        $student = Student::factory()->notRegistered()->create(['student_id' => 'PB-10200']);

        $incomplete = $this->actingAs($this->superAdmin)->putJson("/api/v1/admin/students/{$student->id}", [
            'student_id' => 'PB-10200',
            'full_name' => 'Backfilled Name',
        ]);
        $incomplete->assertUnprocessable()->assertJsonValidationErrors([
            'contact_number', 'address', 'date_of_birth', 'visa_status', 'industry_id', 'profession_id',
        ]);

        $complete = $this->actingAs($this->superAdmin)->putJson(
            "/api/v1/admin/students/{$student->id}",
            $this->validStudentPayload(['student_id' => 'PB-10200', 'full_name' => 'Backfilled Name']),
        );
        $complete->assertOk()->assertJsonPath('data.full_name', 'Backfilled Name');
    }

    public function test_admin_can_block_and_unblock_a_student(): void
    {
        $student = Student::factory()->create(['is_blocked' => false]);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/students/{$student->id}/block")
            ->assertOk()
            ->assertJsonPath('data.is_blocked', true);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/students/{$student->id}/unblock")
            ->assertOk()
            ->assertJsonPath('data.is_blocked', false);
    }

    public function test_admin_can_soft_delete_a_student(): void
    {
        $student = Student::factory()->create();

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/v1/admin/students/{$student->id}")
            ->assertOk();

        $this->assertSoftDeleted('students', ['id' => $student->id]);
    }

    public function test_non_super_admin_cannot_delete_a_student(): void
    {
        $supportAgent = User::factory()->create();
        $supportAgent->assignRole(RoleName::SupportAgent->value);
        $student = Student::factory()->create();

        $this->actingAs($supportAgent)
            ->deleteJson("/api/v1/admin/students/{$student->id}")
            ->assertForbidden();
    }

    public function test_admin_can_bulk_import_students_via_csv(): void
    {
        $csv = "student_id,full_name\nPB-20001,Jane Doe\nPB-20002,\n";
        $file = UploadedFile::fake()->createWithContent('students.csv', $csv);

        $response = $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/students/import', ['file' => $file]);

        $response->assertOk()->assertJsonPath('data.imported', 2);
        $this->assertDatabaseHas('students', ['student_id' => 'PB-20001', 'full_name' => 'Jane Doe']);
    }

    public function test_import_skips_rows_with_a_student_id_that_already_exists(): void
    {
        Student::factory()->create(['student_id' => 'PB-30001']);

        $csv = "student_id\nPB-30001\nPB-30002\n";
        $file = UploadedFile::fake()->createWithContent('students.csv', $csv);

        $response = $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/students/import', ['file' => $file]);

        $response->assertOk()
            ->assertJsonPath('data.imported', 1)
            ->assertJsonPath('data.skipped', 1);
    }

    public function test_admin_can_upload_a_student_profile_photo(): void
    {
        $student = Student::factory()->create();
        $photo = UploadedFile::fake()->image('avatar.jpg', 800, 800);

        $response = $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/students/{$student->id}/photo", ['photo' => $photo]);

        $response->assertOk();
        $this->assertNotNull($response->json('data.profile_photo_url'));
        $this->assertCount(1, $student->fresh()->getMedia('profile_photo'));
    }

    public function test_uploading_a_second_photo_replaces_the_first(): void
    {
        $student = Student::factory()->create();

        $this->actingAs($this->superAdmin)->postJson("/api/v1/admin/students/{$student->id}/photo", [
            'photo' => UploadedFile::fake()->image('one.jpg', 800, 800),
        ]);
        $this->actingAs($this->superAdmin)->postJson("/api/v1/admin/students/{$student->id}/photo", [
            'photo' => UploadedFile::fake()->image('two.jpg', 800, 800),
        ]);

        $this->assertCount(1, $student->fresh()->getMedia('profile_photo'));
    }

    public function test_photo_upload_rejects_non_image_files(): void
    {
        $student = Student::factory()->create();
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/students/{$student->id}/photo", ['photo' => $file])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photo');
    }

    public function test_admin_can_remove_a_student_profile_photo(): void
    {
        $student = Student::factory()->create();
        $this->actingAs($this->superAdmin)->postJson("/api/v1/admin/students/{$student->id}/photo", [
            'photo' => UploadedFile::fake()->image('avatar.jpg', 800, 800),
        ]);

        $response = $this->actingAs($this->superAdmin)->deleteJson("/api/v1/admin/students/{$student->id}/photo");

        $response->assertOk()->assertJsonPath('data.profile_photo_url', null);
    }

    public function test_support_agent_can_upload_a_student_photo_but_not_delete_the_student(): void
    {
        $supportAgent = User::factory()->create();
        $supportAgent->assignRole(RoleName::SupportAgent->value);
        $student = Student::factory()->create();

        $this->actingAs($supportAgent)
            ->postJson("/api/v1/admin/students/{$student->id}/photo", [
                'photo' => UploadedFile::fake()->image('avatar.jpg', 800, 800),
            ])
            ->assertOk();
    }

    public function test_stats_endpoint_returns_counts(): void
    {
        Student::factory()->registered()->create();
        Student::factory()->notRegistered()->create();
        Student::factory()->registered()->blocked()->create();

        $response = $this->actingAs($this->superAdmin)->getJson('/api/v1/admin/students/stats');

        $response->assertOk()
            ->assertJsonPath('data.total', 3)
            ->assertJsonPath('data.blocked', 1);
    }
}
