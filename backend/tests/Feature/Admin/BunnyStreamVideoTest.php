<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Enums\VideoProcessingStatus;
use App\Enums\VideoProvider;
use App\Models\CourseVideo;
use App\Models\Student;
use App\Models\User;
use App\Services\Course\CourseVideoService;
use App\Support\BunnyToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * The Bunny Stream path. Every Bunny call is faked — the suite must never touch
 * the network, and there are no credentials on a developer machine anyway.
 */
class BunnyStreamVideoTest extends TestCase
{
    use RefreshDatabase;

    private User $contentManager;

    private CourseVideo $video;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->contentManager = User::factory()->create();
        $this->contentManager->assignRole(RoleName::ContentManager->value);

        $this->video = CourseVideo::factory()->create(['title' => 'Visa basics', 'duration_seconds' => null]);

        config([
            'bunny.enabled' => true,
            'bunny.library_id' => '90210',
            'bunny.api_key' => 'library-master-key',
            'bunny.cdn_hostname' => 'vz-test.b-cdn.net',
            'bunny.token_key' => 'token-security-key',
        ]);
    }

    public function test_upload_ticket_reserves_a_video_and_never_leaks_the_api_key(): void
    {
        Http::fake([
            'video.bunnycdn.com/library/90210/videos' => Http::response(['guid' => 'abc-123'], 200),
        ]);

        $response = $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/upload-ticket")
            ->assertOk()
            ->assertJsonPath('data.video_id', 'abc-123')
            ->assertJsonPath('data.library_id', '90210');

        // The signature is derived from the key; the key itself must not appear
        // anywhere in a payload a browser receives.
        $this->assertStringNotContainsString('library-master-key', $response->getContent());

        $expires = $response->json('data.expires');
        $this->assertSame(
            hash('sha256', '90210'.'library-master-key'.$expires.'abc-123'),
            $response->json('data.signature'),
        );

        $this->video->refresh();
        $this->assertSame(VideoProvider::External, $this->video->provider);
        $this->assertSame('abc-123', $this->video->external_id);
        $this->assertSame(VideoProcessingStatus::Pending, $this->video->processing_status);
    }

    public function test_a_role_without_content_rights_cannot_request_a_ticket(): void
    {
        $accountant = User::factory()->create();
        $accountant->assignRole(RoleName::Accountant->value);

        Http::fake();

        $this->actingAs($accountant)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/upload-ticket")
            ->assertForbidden();

        Http::assertNothingSent();
    }

    public function test_completing_an_upload_marks_the_lesson_processing_until_bunny_finishes(): void
    {
        $this->video->update(['external_id' => 'abc-123', 'provider' => VideoProvider::External]);

        Http::fake([
            'video.bunnycdn.com/library/90210/videos/abc-123' => Http::response(['status' => 3, 'length' => 0], 200),
        ]);

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/upload-complete", [
                'duration_seconds' => 620,
            ])
            ->assertOk()
            ->assertJsonPath('data.processing_status', 'processing')
            ->assertJsonPath('data.has_file', true);
    }

    public function test_bunny_reported_duration_wins_over_the_browsers_estimate(): void
    {
        $this->video->update([
            'external_id' => 'abc-123',
            'provider' => VideoProvider::External,
            'duration_seconds' => 600,
        ]);

        Http::fake([
            'video.bunnycdn.com/library/90210/videos/abc-123' => Http::response(['status' => 4, 'length' => 637], 200),
        ]);

        $this->actingAs($this->contentManager)
            ->getJson("/api/v1/admin/course-videos/{$this->video->id}/processing-status")
            ->assertOk()
            ->assertJsonPath('data.processing_status', 'ready')
            // The no-skip rule is computed against this number, so the host's
            // measurement beats what the browser guessed off the picked file.
            ->assertJsonPath('data.duration_seconds', 637);
    }

    public function test_playback_returns_a_token_signed_hls_url(): void
    {
        $this->video->update([
            'external_id' => 'abc-123',
            'provider' => VideoProvider::External,
            'processing_status' => VideoProcessingStatus::Ready,
        ]);

        $url = $this->actingAs($this->contentManager)
            ->getJson("/api/v1/admin/course-videos/{$this->video->id}/stream")
            ->assertOk()
            ->json('data.url');

        $this->assertStringStartsWith('https://vz-test.b-cdn.net/bcdn_token=HS256-', $url);
        $this->assertStringEndsWith('/abc-123/playlist.m3u8', $url);
        // The guid alone is not enough to play; the token must be present.
        $this->assertStringContainsString('expires=', $url);
    }

    public function test_the_signed_url_matches_bunnys_published_algorithm(): void
    {
        $url = BunnyToken::directoryUrl(
            host: 'vz-test.b-cdn.net',
            path: '/abc-123/playlist.m3u8',
            directory: '/abc-123/',
            securityKey: 'token-security-key',
            expires: 1700000000,
        );

        // HMAC-SHA256 over signature_path + expires + signing_data, base64url,
        // as in Bunny's own reference implementation.
        $expected = 'HS256-'.rtrim(strtr(base64_encode(hash_hmac(
            'sha256',
            '/abc-123/'.'1700000000'.'token_path=/abc-123/',
            'token-security-key',
            true,
        )), '+/', '-_'), '=');

        $this->assertStringContainsString('bcdn_token='.$expected, $url);
    }

    public function test_deleting_a_lesson_file_also_deletes_it_at_bunny(): void
    {
        $this->video->update(['external_id' => 'abc-123', 'provider' => VideoProvider::External]);

        Http::fake();

        $this->actingAs($this->contentManager)
            ->deleteJson("/api/v1/admin/course-videos/{$this->video->id}/file")
            ->assertOk()
            ->assertJsonPath('data.has_file', false);

        // Storage is billed until the video is gone from Bunny too.
        Http::assertSent(fn ($request) => $request->method() === 'DELETE'
            && str_contains($request->url(), '/library/90210/videos/abc-123'));

        $fresh = $this->video->fresh();
        $this->assertNull($fresh->external_id);
        $this->assertSame(VideoProvider::Upload, $fresh->provider);
    }

    public function test_a_migrated_lesson_keeps_playing_from_disk_while_bunny_encodes(): void
    {
        $this->giveLocalFile();

        // State `videos:migrate-to-bunny` leaves behind: Bunny has the bytes,
        // the free encoding queue has not got to them yet.
        $this->video->update([
            'external_id' => 'abc-123',
            'provider' => VideoProvider::External,
            'processing_status' => VideoProcessingStatus::Processing,
        ]);

        $url = $this->actingAs($this->contentManager)
            ->getJson("/api/v1/admin/course-videos/{$this->video->id}/stream")
            ->assertOk()
            ->json('data.url');

        // A published course must not go dark for the hours the queue can take.
        $this->assertStringContainsString("/course-videos/{$this->video->id}/playback", $url);
        $this->assertStringNotContainsString('b-cdn.net', $url);
    }

    public function test_a_migrated_lesson_switches_to_bunny_once_encoded(): void
    {
        $this->giveLocalFile();

        $this->video->update([
            'external_id' => 'abc-123',
            'provider' => VideoProvider::External,
            'processing_status' => VideoProcessingStatus::Ready,
        ]);

        $this->actingAs($this->contentManager)
            ->getJson("/api/v1/admin/course-videos/{$this->video->id}/stream")
            ->assertOk()
            ->assertJsonPath('data.url', fn (string $url) => str_starts_with($url, 'https://vz-test.b-cdn.net/'));
    }

    public function test_a_lesson_only_on_bunny_is_not_streamable_until_encoded(): void
    {
        $this->video->update([
            'external_id' => 'abc-123',
            'provider' => VideoProvider::External,
            'processing_status' => VideoProcessingStatus::Processing,
        ]);

        // The playlist does not exist yet; a URL to it would only fail in the player.
        $this->actingAs($this->contentManager)
            ->getJson("/api/v1/admin/course-videos/{$this->video->id}/stream")
            ->assertNotFound();
    }

    public function test_a_correctly_signed_webhook_is_acted_on(): void
    {
        config(['bunny.webhook_key' => 'read-only-key']);

        $this->video->update([
            'external_id' => 'abc-123',
            'provider' => VideoProvider::External,
            'processing_status' => VideoProcessingStatus::Processing,
        ]);

        Http::fake([
            'video.bunnycdn.com/library/90210/videos/abc-123' => Http::response(['status' => 4, 'length' => 300], 200),
        ]);

        $body = '{"VideoLibraryId":90210,"VideoGuid":"abc-123","Status":3}';

        $this->postSignedWebhook($body, hash_hmac('sha256', $body, 'read-only-key'))->assertOk();

        $this->assertSame(VideoProcessingStatus::Ready, $this->video->fresh()->processing_status);
    }

    public function test_a_badly_signed_webhook_is_ignored(): void
    {
        config(['bunny.webhook_key' => 'read-only-key']);

        $this->video->update(['external_id' => 'abc-123', 'provider' => VideoProvider::External]);

        Http::fake();

        $body = '{"VideoLibraryId":90210,"VideoGuid":"abc-123","Status":3}';

        // Still 200: Bunny retries a non-2xx, and a retry would not fix a bad key.
        $this->postSignedWebhook($body, hash_hmac('sha256', $body, 'wrong-key'))->assertOk();

        Http::assertNothingSent();
    }

    public function test_the_webhook_trusts_nothing_in_its_body(): void
    {
        $this->video->update([
            'external_id' => 'abc-123',
            'provider' => VideoProvider::External,
            'processing_status' => VideoProcessingStatus::Processing,
        ]);

        // Body claims the video finished; Bunny's API says it failed. The API wins.
        Http::fake([
            'video.bunnycdn.com/library/90210/videos/abc-123' => Http::response(['status' => 5], 200),
        ]);

        $this->postJson('/api/v1/videos/bunny/webhook', [
            'VideoLibraryId' => 90210,
            'VideoGuid' => 'abc-123',
            'Status' => 4,
        ])->assertOk();

        $this->assertSame(VideoProcessingStatus::Failed, $this->video->fresh()->processing_status);
    }

    public function test_a_webhook_for_another_library_is_ignored(): void
    {
        $this->video->update(['external_id' => 'abc-123', 'provider' => VideoProvider::External]);

        Http::fake();

        $this->postJson('/api/v1/videos/bunny/webhook', [
            'VideoLibraryId' => 11111,
            'VideoGuid' => 'abc-123',
            'Status' => 4,
        ])->assertOk();

        Http::assertNothingSent();
    }

    public function test_a_student_gets_a_shorter_window_than_an_admin(): void
    {
        $this->video->update([
            'external_id' => 'abc-123',
            'provider' => VideoProvider::External,
            'processing_status' => VideoProcessingStatus::Ready,
        ]);

        $service = app(CourseVideoService::class);

        $adminExpiry = $service->playbackUrl($this->video)['expires_at'];
        $studentExpiry = $service->playbackUrl($this->video, Student::factory()->create())['expires_at'];

        // Bytes bypass this server entirely, so a block landing mid-lesson only
        // takes effect at expiry — the student window is kept short for that.
        $this->assertTrue($studentExpiry < $adminExpiry);
    }

    public function test_everything_falls_back_to_local_hosting_when_bunny_is_off(): void
    {
        config(['bunny.enabled' => false]);

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-videos/{$this->video->id}/upload-ticket")
            ->assertStatus(409);
    }

    private function giveLocalFile(): void
    {
        Storage::fake(CourseVideo::VIDEO_DISK);

        $path = tempnam(sys_get_temp_dir(), 'planb_test_mp4_').'.mp4';
        // An MP4 `ftyp` header, so the collection's mime guard accepts it.
        file_put_contents($path, pack('N', 32).'ftypisom'.pack('N', 512).'isomiso2avc1mp41'.str_repeat("\0", 4096));

        app(CourseVideoService::class)->attachFile(
            $this->video,
            new UploadedFile($path, 'lesson.mp4', 'video/mp4', null, true),
            600,
        );
    }

    private function postSignedWebhook(string $body, string $signature): TestResponse
    {
        return $this->call('POST', '/api/v1/videos/bunny/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_BUNNYSTREAM_SIGNATURE_VERSION' => 'v1',
            'HTTP_X_BUNNYSTREAM_SIGNATURE_ALGORITHM' => 'hmac-sha256',
            'HTTP_X_BUNNYSTREAM_SIGNATURE' => $signature,
        ], $body);
    }
}
