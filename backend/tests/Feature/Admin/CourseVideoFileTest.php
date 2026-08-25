<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\CourseVideo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CourseVideoFileTest extends TestCase
{
    use RefreshDatabase;

    private User $contentManager;

    private User $accountant;

    private CourseVideo $video;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('course_videos');
        Storage::fake('public');

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->contentManager = User::factory()->create();
        $this->contentManager->assignRole(RoleName::ContentManager->value);

        $this->accountant = User::factory()->create();
        $this->accountant->assignRole(RoleName::Accountant->value);

        $this->video = CourseVideo::factory()->create(['title' => 'Introduction', 'duration_seconds' => null]);
    }

    /**
     * A file the media collection's own mime guard accepts. `UploadedFile::fake()`
     * writes zero bytes, which detects as `application/x-empty` and gets rejected,
     * so this writes a real MP4 `ftyp` box header instead.
     */
    private function fakeMp4(string $name = 'lesson.mp4', int $padding = 4096): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'planb_test_mp4_').'.mp4';

        // 32-byte box, type "ftyp", major brand "isom" — enough for detection.
        $header = pack('N', 32).'ftypisom'.pack('N', 512).'isomiso2avc1mp41';
        file_put_contents($path, $header.str_repeat("\0", $padding));

        return new UploadedFile($path, $name, 'video/mp4', null, true);
    }

    public function test_admin_can_upload_a_lesson_file(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/file", [
                'file' => $this->fakeMp4(),
                'duration_seconds' => 640,
            ])
            ->assertOk()
            ->assertJsonPath('data.has_file', true)
            ->assertJsonPath('data.duration_seconds', 640);

        $this->assertNotNull($this->video->fresh()->videoMedia());
    }

    public function test_a_non_video_file_is_rejected(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/file", [
                'file' => UploadedFile::fake()->create('notes.pdf', 20, 'application/pdf'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');
    }

    public function test_a_role_without_content_rights_cannot_upload(): void
    {
        $this->actingAs($this->accountant)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/file", [
                'file' => $this->fakeMp4(),
            ])
            ->assertForbidden();
    }

    public function test_admin_can_remove_a_lesson_file(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/file", [
                'file' => $this->fakeMp4(),
                'duration_seconds' => 300,
            ])
            ->assertOk();

        $this->actingAs($this->contentManager)
            ->deleteJson("/api/v1/admin/course-videos/{$this->video->id}/file")
            ->assertOk()
            ->assertJsonPath('data.has_file', false)
            ->assertJsonPath('data.duration_seconds', null);
    }

    public function test_the_stream_endpoint_returns_a_signed_short_lived_url(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/file", [
                'file' => $this->fakeMp4(),
            ])
            ->assertOk();

        $url = $this->actingAs($this->contentManager)
            ->getJson("/api/v1/admin/course-videos/{$this->video->id}/stream")
            ->assertOk()
            ->json('data.url');

        $this->assertStringContainsString('signature=', $url);
        $this->assertStringContainsString('expires=', $url);
    }

    public function test_streaming_a_video_with_no_file_is_a_404(): void
    {
        $this->actingAs($this->contentManager)
            ->getJson("/api/v1/admin/course-videos/{$this->video->id}/stream")
            ->assertNotFound();
    }

    public function test_playback_needs_a_valid_signature(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/file", [
                'file' => $this->fakeMp4(),
            ])
            ->assertOk();

        // Unsigned: the whole point of serving playback outside the session guard.
        $this->get("/api/v1/course-videos/{$this->video->id}/playback")->assertForbidden();

        $url = $this->actingAs($this->contentManager)
            ->getJson("/api/v1/admin/course-videos/{$this->video->id}/stream")
            ->json('data.url');

        $this->get($url)->assertOk()->assertHeader('Accept-Ranges', 'bytes');
    }

    public function test_admin_can_upload_and_remove_a_thumbnail(): void
    {
        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/thumbnail", [
                'thumbnail' => UploadedFile::fake()->image('thumb.jpg', 1600, 900),
            ])
            ->assertOk()
            ->assertJsonPath('data.thumbnail_url', fn (?string $url) => $url !== null);

        $this->actingAs($this->contentManager)
            ->deleteJson("/api/v1/admin/course-videos/{$this->video->id}/thumbnail")
            ->assertOk()
            ->assertJsonPath('data.thumbnail_url', null);
    }
}
