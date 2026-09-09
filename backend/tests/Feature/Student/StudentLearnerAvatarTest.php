<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentLearnerAvatarTest extends TestCase
{
    use RefreshDatabase;

    private Student $viewer;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->viewer = Student::factory()->registered()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->viewer, ['student'], 'student');
    }

    private function withPhoto(Student $student): Student
    {
        $student->addMedia(UploadedFile::fake()->image('face.jpg', 400, 400))
            ->toMediaCollection('profile_photo');

        return $student;
    }

    public function test_it_returns_photos_of_other_registered_students(): void
    {
        $this->withPhoto(Student::factory()->registered()->create(['is_blocked' => false]));
        $this->withPhoto(Student::factory()->registered()->create(['is_blocked' => false]));

        $this->getJson('/api/v1/student/learner-avatars')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data' => [['photo_url']]]);
    }

    /**
     * A face identifies a person even with the name stripped, so this endpoint
     * carries the photo and nothing else. If any of these keys ever appears,
     * the stack has started leaking who Plan B's students are.
     */
    public function test_it_carries_no_identifying_fields(): void
    {
        $this->withPhoto(Student::factory()->registered()->create(['is_blocked' => false]));

        $body = $this->getJson('/api/v1/student/learner-avatars')->assertOk()->getContent();

        foreach (['full_name', 'student_id', 'email', '"id"'] as $key) {
            $this->assertStringNotContainsString($key, $body);
        }
    }

    public function test_it_skips_the_viewer_and_anyone_without_a_photo(): void
    {
        $this->withPhoto($this->viewer);
        Student::factory()->registered()->create(['is_blocked' => false]);

        $this->getJson('/api/v1/student/learner-avatars')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_it_skips_blocked_and_unregistered_students(): void
    {
        $this->withPhoto(Student::factory()->registered()->create(['is_blocked' => true]));
        $this->withPhoto(Student::factory()->notRegistered()->create(['is_blocked' => false]));

        $this->getJson('/api/v1/student/learner-avatars')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_it_caps_the_stack(): void
    {
        foreach (range(1, 6) as $ignored) {
            $this->withPhoto(Student::factory()->registered()->create(['is_blocked' => false]));
        }

        $this->getJson('/api/v1/student/learner-avatars')
            ->assertOk()
            ->assertJsonCount(4, 'data');
    }

    public function test_it_requires_authentication(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/student/learner-avatars')->assertUnauthorized();
    }
}
