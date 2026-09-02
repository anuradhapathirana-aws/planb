<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StudentDocumentTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $accountant;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('student_documents');

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->assignRole(RoleName::SuperAdmin->value);

        // An Accountant may view a student but not update one — see StudentPolicy.
        $this->accountant = User::factory()->create();
        $this->accountant->assignRole(RoleName::Accountant->value);

        $this->student = Student::factory()->create();
    }

    /**
     * `UploadedFile::fake()` writes zero bytes, which sniffs as `application/x-empty`
     * and is rejected by both the `mimetypes` rule and the media collection's own
     * mime guard — so these helpers write real magic bytes, as CourseVideoFileTest does.
     */
    private function fakePdf(string $name = 'cv.pdf', int $padding = 2048): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'planb_test_pdf_').'.pdf';
        $body = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n";
        file_put_contents($path, $body.str_repeat('%', $padding)."\n%%EOF\n");

        return new UploadedFile($path, $name, 'application/pdf', null, true);
    }

    private function fakeMp4(string $name = 'intro.mp4', int $padding = 4096): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'planb_test_mp4_').'.mp4';

        // 32-byte box, type "ftyp", major brand "isom" — enough for detection.
        $header = pack('N', 32).'ftypisom'.pack('N', 512).'isomiso2avc1mp41';
        file_put_contents($path, $header.str_repeat("\0", $padding));

        return new UploadedFile($path, $name, 'video/mp4', null, true);
    }

    public function test_admin_can_upload_a_pdf_cv(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakePdf('nimal-cv.pdf')]);

        $response->assertOk()
            ->assertJsonPath('data.cv.has_file', true)
            // The name the admin uploaded, not the internal storage name.
            ->assertJsonPath('data.cv.file_name', 'nimal-cv.pdf');

        $media = $this->student->fresh()->cvMedia();

        $this->assertNotNull($media);
        $this->assertSame(Student::DOCUMENT_DISK, $media->disk);
    }

    public function test_cv_payload_never_carries_a_file_url(): void
    {
        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakePdf()]);

        $payload = $this->actingAs($this->superAdmin)
            ->getJson("/api/v1/admin/students/{$this->student->id}")
            ->assertOk()
            ->json('data.cv');

        $this->assertSame(['has_file', 'file_name', 'file_size_bytes', 'uploaded_at'], array_keys($payload));
    }

    public function test_cv_must_be_a_pdf(): void
    {
        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakeMp4('cv.mp4')])
            ->assertJsonValidationErrorFor('cv');

        $this->assertNull($this->student->fresh()->cvMedia());
    }

    /** A video renamed `.pdf` passes the extension check and must still be rejected. */
    public function test_cv_rejects_a_non_pdf_renamed_to_pdf(): void
    {
        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakeMp4('resume.pdf')])
            ->assertJsonValidationErrorFor('cv');
    }

    public function test_cv_over_five_megabytes_is_rejected(): void
    {
        // 5 MB plus a kilobyte of padding, so the file sits just past the cap.
        $oversized = $this->fakePdf('big-cv.pdf', 5 * 1024 * 1024 + 1024);

        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $oversized])
            ->assertJsonValidationErrorFor('cv');

        $this->assertNull($this->student->fresh()->cvMedia());
    }

    public function test_admin_can_upload_a_profile_video(): void
    {
        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/profile-video", [
                'profile_video' => $this->fakeMp4(),
            ])
            ->assertOk()
            ->assertJsonPath('data.profile_video.has_file', true);

        $this->assertNotNull($this->student->fresh()->profileVideoMedia());
    }

    public function test_profile_video_must_be_a_video(): void
    {
        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/profile-video", [
                'profile_video' => $this->fakePdf('clip.mp4'),
            ])
            ->assertJsonValidationErrorFor('profile_video');
    }

    public function test_profile_video_over_ten_megabytes_is_rejected(): void
    {
        $oversized = $this->fakeMp4('long.mp4', 10 * 1024 * 1024 + 1024);

        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/profile-video", ['profile_video' => $oversized])
            ->assertJsonValidationErrorFor('profile_video');

        $this->assertNull($this->student->fresh()->profileVideoMedia());
    }

    public function test_admin_can_remove_a_cv(): void
    {
        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakePdf()]);

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/v1/admin/students/{$this->student->id}/cv")
            ->assertOk()
            ->assertJsonPath('data.cv.has_file', false);

        $this->assertNull($this->student->fresh()->cvMedia());
    }

    public function test_uploading_a_second_cv_replaces_the_first(): void
    {
        foreach (['first.pdf', 'second.pdf'] as $name) {
            $this->actingAs($this->superAdmin)
                ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakePdf($name)]);
        }

        $student = $this->student->fresh();

        $this->assertCount(1, $student->getMedia(Student::CV_COLLECTION));
        $this->assertSame('second.pdf', $student->cvMedia()->getCustomProperty('original_name'));
    }

    public function test_admin_without_update_permission_cannot_upload(): void
    {
        $this->actingAs($this->accountant)
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakePdf()])
            ->assertForbidden();
    }

    public function test_guest_cannot_upload(): void
    {
        // Multipart, so `post` not `postJson` — the Accept header is what makes an
        // unauthenticated request answer 401 instead of redirecting to a login page.
        $this->withHeader('Accept', 'application/json')
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakePdf()])
            ->assertUnauthorized();
    }

    public function test_document_link_is_signed_and_serves_the_file(): void
    {
        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakePdf()]);

        $url = $this->actingAs($this->superAdmin)
            ->getJson("/api/v1/admin/students/{$this->student->id}/documents/cv/link")
            ->assertOk()
            ->json('data.url');

        $this->assertStringContainsString('signature=', $url);

        $response = $this->get($url);

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_document_bytes_cannot_be_fetched_without_a_signature(): void
    {
        $this->actingAs($this->superAdmin)
            ->post("/api/v1/admin/students/{$this->student->id}/cv", ['cv' => $this->fakePdf()]);

        $this->get("/api/v1/students/{$this->student->id}/documents/cv")->assertForbidden();
    }

    public function test_document_link_404s_when_nothing_is_on_file(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson("/api/v1/admin/students/{$this->student->id}/documents/profile-video/link")
            ->assertNotFound();
    }

    public function test_guest_cannot_mint_a_document_link(): void
    {
        $this->getJson("/api/v1/admin/students/{$this->student->id}/documents/cv/link")->assertUnauthorized();
    }
}
