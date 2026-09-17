<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The Course Details learner stack. Other students appear as initials only —
 * never a photo (launch guide §1: "Other learners" strip shows initials only).
 */
class StudentLearnerAvatarTest extends TestCase
{
    use RefreshDatabase;

    private Student $viewer;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake(Student::DOCUMENT_DISK);

        $this->viewer = Student::factory()->registered()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->viewer, ['student'], 'student');
    }

    private function learner(string $name = 'Nimal Perera', array $attributes = []): Student
    {
        return Student::factory()->registered()->create(array_merge([
            'full_name' => $name,
            'is_blocked' => false,
        ], $attributes));
    }

    public function test_it_returns_initials_of_other_registered_students(): void
    {
        $this->learner('Nimal Perera');
        $this->learner('kasun');

        $this->getJson('/api/v1/student/learner-avatars')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['initials' => 'NP'])
            ->assertJsonFragment(['initials' => 'K']);
    }

    /**
     * The one endpoint where a student reads about other students. A photo
     * identifies a person even with the name stripped, so none is sent — not even
     * for a learner who has one — and nothing that joins back to a record.
     */
    public function test_it_carries_initials_and_nothing_else(): void
    {
        $learner = $this->learner('Nimal Perera', ['email' => 'nimal@example.com']);
        $face = UploadedFile::fake()->image('face.jpg', 400, 400);
        $learner->addMedia($face->getRealPath())
            ->preservingOriginal()
            ->toMediaCollection(Student::PHOTO_COLLECTION);

        $response = $this->getJson('/api/v1/student/learner-avatars')->assertOk();

        $this->assertSame([['initials' => 'NP']], $response->json('data'));

        $body = $response->getContent();
        foreach (['photo', 'url', 'full_name', 'Nimal', 'student_id', $learner->student_id, 'email', '"id"'] as $needle) {
            $this->assertStringNotContainsString($needle, $body);
        }
    }

    public function test_it_skips_the_viewer_and_anyone_without_a_name(): void
    {
        $this->viewer->update(['full_name' => 'Viewer Person']);
        $this->learner('', []);
        Student::factory()->registered()->create(['is_blocked' => false, 'full_name' => null]);

        $this->getJson('/api/v1/student/learner-avatars')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_it_skips_blocked_unregistered_and_deleted_students(): void
    {
        $this->learner('Blocked One', ['is_blocked' => true]);
        Student::factory()->notRegistered()->create(['is_blocked' => false, 'full_name' => 'Not Yet']);
        $this->learner('Deleted One')->delete();

        $this->getJson('/api/v1/student/learner-avatars')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_it_caps_the_stack(): void
    {
        foreach (range(1, 6) as $ignored) {
            $this->learner();
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
