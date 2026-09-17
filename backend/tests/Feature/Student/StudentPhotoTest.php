<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\RoleName;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Profile photos used to be public at `/storage/{mediaId}/{student_id}.jpg`, so
 * every student's face could be downloaded by counting. They are now private and
 * reachable only through a signed link.
 */
class StudentPhotoTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake(Student::DOCUMENT_DISK);

        $this->student = Student::factory()->registered()->create(['is_blocked' => false]);
    }

    private function uploadAsStudent(): string
    {
        Sanctum::actingAs($this->student, ['student'], 'student');

        $url = $this->postJson('/api/v1/student/profile/photo', [
            'photo' => UploadedFile::fake()->image('me.jpg', 800, 800),
        ])->assertOk()->json('data.profile_photo_url');

        $this->assertIsString($url);

        return $url;
    }

    /** A request with no credentials at all, the way `expo-image` or an `<img>` fetches. */
    private function asBrowser(): self
    {
        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');

        return $this;
    }

    public function test_a_photo_is_stored_privately_under_a_random_name(): void
    {
        $this->uploadAsStudent();

        $media = $this->student->fresh()->photoMedia();

        $this->assertSame(Student::DOCUMENT_DISK, $media->disk);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}\.jpg$/', $media->file_name);
        $this->assertStringNotContainsString($this->student->student_id, $media->file_name);
        $this->assertSame([], Storage::disk('public')->allFiles(), 'Nothing may land on the public disk.');
    }

    public function test_the_profile_carries_a_signed_link_that_serves_the_photo(): void
    {
        $url = $this->uploadAsStudent();

        $this->assertStringNotContainsString('/storage/', $url);
        $this->assertStringContainsString('signature=', $url);

        $response = $this->asBrowser()->get($url)
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        // Never `public`: a shared proxy must not hand one student's face to another request.
        $this->assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        $this->assertStringNotContainsString('public', (string) $response->headers->get('Cache-Control'));
    }

    /** The app's image cache keys on the URL, so the link must not change on every request. */
    public function test_the_link_is_stable_within_the_hour_and_changes_with_a_new_photo(): void
    {
        $this->travelTo(now()->startOfHour()->addMinutes(5));
        $first = $this->uploadAsStudent();

        $this->travel(20)->minutes();
        $this->assertSame($first, $this->getJson('/api/v1/student/profile')->json('data.profile_photo_url'));

        $second = $this->uploadAsStudent();
        $this->assertNotSame($first, $second, 'A new photo must bust the cache.');
    }

    public function test_an_expired_link_is_refused(): void
    {
        $url = $this->uploadAsStudent();

        $this->travel(3)->hours();

        $this->asBrowser()->get($url)->assertForbidden();
    }

    public function test_a_link_cannot_be_pointed_at_another_student(): void
    {
        $url = $this->uploadAsStudent();
        $other = Student::factory()->registered()->create();

        $tampered = str_replace("/students/{$this->student->id}/photo", "/students/{$other->id}/photo", $url);

        $this->asBrowser()->get($tampered)->assertForbidden();
    }

    public function test_an_unsigned_request_is_refused(): void
    {
        $this->uploadAsStudent();

        $this->asBrowser()->get("/api/v1/students/{$this->student->id}/photo")->assertForbidden();
    }

    public function test_the_admin_record_carries_a_working_signed_link(): void
    {
        $this->uploadAsStudent();

        Role::firstOrCreate(['name' => RoleName::SuperAdmin->value, 'guard_name' => 'web']);
        $admin = User::factory()->create();
        $admin->assignRole(RoleName::SuperAdmin->value);

        $url = $this->asBrowser()->actingAs($admin)
            ->getJson("/api/v1/admin/students/{$this->student->id}")
            ->assertOk()
            ->json('data.profile_photo_url');

        $this->assertStringContainsString('signature=', (string) $url);

        $this->app['auth']->forgetGuards();
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/jpeg');
    }

    public function test_the_migrate_command_moves_old_public_photos(): void
    {
        // The old state: `{student_id}.jpg` on the public disk.
        $old = UploadedFile::fake()->image('old.jpg', 600, 600);
        $this->student->addMedia($old->getRealPath())
            ->preservingOriginal()
            ->usingFileName($this->student->student_id.'.jpg')
            ->toMediaCollection(Student::PHOTO_COLLECTION, 'public');
        $this->assertSame('public', $this->student->fresh()->photoMedia()->disk);

        // Until moved, the signed route refuses to serve it.
        $link = URL::temporarySignedRoute('student-photos.show', now()->addHour(), ['student' => $this->student->id]);
        $this->asBrowser()->get($link)->assertNotFound();

        $this->artisan('students:migrate-photos', ['--dry-run' => true])->assertSuccessful();
        $this->assertSame('public', $this->student->fresh()->photoMedia()->disk);

        $this->artisan('students:migrate-photos')->assertSuccessful();

        $moved = $this->student->fresh()->photoMedia();
        $this->assertSame(Student::DOCUMENT_DISK, $moved->disk);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}\.jpg$/', $moved->file_name);
        $this->assertSame([], Storage::disk('public')->allFiles(), 'The public copy must be deleted.');
        $this->assertCount(1, $this->student->fresh()->getMedia(Student::PHOTO_COLLECTION));

        $this->artisan('students:migrate-photos')
            ->expectsOutputToContain('Nothing to move')
            ->assertSuccessful();
    }
}
