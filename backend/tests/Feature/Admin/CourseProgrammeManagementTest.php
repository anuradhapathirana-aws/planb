<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\CourseStatus;
use App\Enums\RoleName;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\CourseTopic;
use App\Models\CourseVideo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CourseProgrammeManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $contentManager;

    private User $accountant;

    private CourseCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (RoleName::values() as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->assignRole(RoleName::SuperAdmin->value);

        $this->contentManager = User::factory()->create();
        $this->contentManager->assignRole(RoleName::ContentManager->value);

        $this->accountant = User::factory()->create();
        $this->accountant->assignRole(RoleName::Accountant->value);

        $this->category = CourseCategory::factory()->create(['name' => 'UAE Migration Program']);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'course_category_id' => $this->category->id,
            'name' => 'Phase 1 — UAE Awareness & Reality Check',
            'description' => 'Sets expectations before anyone books a ticket.',
            'topics' => [
                [
                    'title' => 'Why UAE / Dubai?',
                    'description' => '<p>Read the <a href="https://example.com">overview</a> first.</p>',
                    'videos' => [
                        ['title' => 'Introduction', 'duration_seconds' => 420],
                        ['title' => 'Cost of living', 'duration_seconds' => 610],
                    ],
                ],
                [
                    'title' => 'Career Assessment Evaluation',
                    'description' => null,
                    'videos' => [['title' => 'How the assessment works', 'duration_seconds' => 300]],
                ],
            ],
        ], $overrides);
    }

    public function test_guest_cannot_list_course_programmes(): void
    {
        $this->getJson('/api/v1/admin/course-programmes')->assertUnauthorized();
    }

    public function test_admin_can_create_a_programme_with_topics_and_videos(): void
    {
        $response = $this->actingAs($this->contentManager)
            ->postJson('/api/v1/admin/course-programmes', $this->payload());

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Phase 1 — UAE Awareness & Reality Check')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.category.id', $this->category->id)
            ->assertJsonCount(2, 'data.topics')
            ->assertJsonCount(2, 'data.topics.0.videos')
            ->assertJsonPath('data.topics.0.videos.0.title', 'Introduction')
            ->assertJsonPath('data.topics.0.videos.0.has_file', false);

        $this->assertDatabaseCount('course_topics', 2);
        $this->assertDatabaseCount('course_videos', 3);
    }

    public function test_topics_and_videos_are_saved_in_the_submitted_order(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $this->payload());

        $response->assertCreated()
            ->assertJsonPath('data.topics.0.sort_order', 0)
            ->assertJsonPath('data.topics.1.sort_order', 1)
            ->assertJsonPath('data.topics.0.videos.1.sort_order', 1);
    }

    public function test_topic_descriptions_are_sanitized_before_storage(): void
    {
        $payload = $this->payload();
        $payload['topics'][0]['description'] =
            '<p onclick="steal()">Visit <a href="javascript:alert(1)">this</a> and '
            .'<a href="https://planb.lk" target="_blank">this</a></p><script>alert(1)</script>';

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $payload)
            ->assertCreated();

        $description = CourseTopic::query()->where('title', 'Why UAE / Dubai?')->value('description');

        $this->assertStringNotContainsString('script', $description);
        $this->assertStringNotContainsString('onclick', $description);
        $this->assertStringNotContainsString('javascript:', $description);
        $this->assertStringContainsString('https://planb.lk', $description);
        $this->assertStringContainsString('rel="noopener noreferrer"', $description);
    }

    public function test_a_programme_needs_at_least_one_topic(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $this->payload(['topics' => []]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('topics');
    }

    public function test_every_topic_needs_a_title(): void
    {
        $payload = $this->payload();
        $payload['topics'][1]['title'] = '';

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('topics.1.title');
    }

    public function test_every_video_needs_a_title(): void
    {
        $payload = $this->payload();
        $payload['topics'][0]['videos'][0]['title'] = '';

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('topics.0.videos.0.title');
    }

    public function test_programme_names_are_unique_within_a_category_only(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $this->payload())
            ->assertCreated();

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $otherCategory = CourseCategory::factory()->create();

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $this->payload([
                'course_category_id' => $otherCategory->id,
            ]))
            ->assertCreated();
    }

    public function test_a_role_without_content_rights_cannot_create_a_programme(): void
    {
        $this->actingAs($this->accountant)
            ->postJson('/api/v1/admin/course-programmes', $this->payload())
            ->assertForbidden();
    }

    public function test_editing_keeps_existing_rows_and_removes_dropped_ones(): void
    {
        $created = $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $this->payload())
            ->assertCreated()
            ->json('data');

        $firstTopic = $created['topics'][0];
        $keptVideoId = $firstTopic['videos'][0]['id'];

        $this->actingAs($this->superAdmin)
            ->putJson("/api/v1/admin/course-programmes/{$created['id']}", [
                'course_category_id' => $this->category->id,
                'name' => 'Phase 1 — UAE Awareness & Reality Check',
                'topics' => [
                    [
                        'id' => $firstTopic['id'],
                        'title' => 'Why UAE / Dubai? (revised)',
                        'description' => '<p>Updated.</p>',
                        // Second video dropped, second topic dropped entirely.
                        'videos' => [['id' => $keptVideoId, 'title' => 'Introduction', 'duration_seconds' => 420]],
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonCount(1, 'data.topics')
            ->assertJsonPath('data.topics.0.id', $firstTopic['id'])
            ->assertJsonPath('data.topics.0.title', 'Why UAE / Dubai? (revised)')
            ->assertJsonCount(1, 'data.topics.0.videos')
            ->assertJsonPath('data.topics.0.videos.0.id', $keptVideoId);

        $this->assertDatabaseCount('course_topics', 1);
        $this->assertDatabaseCount('course_videos', 1);
    }

    public function test_editing_cannot_adopt_a_topic_from_another_programme(): void
    {
        $programme = CourseProgramme::factory()->create(['course_category_id' => $this->category->id]);
        $foreignTopic = CourseTopic::factory()->create();

        $this->actingAs($this->superAdmin)
            ->putJson("/api/v1/admin/course-programmes/{$programme->id}", [
                'course_category_id' => $this->category->id,
                'name' => $programme->name,
                'topics' => [['id' => $foreignTopic->id, 'title' => 'Stolen topic', 'videos' => []]],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('topics.0.id');
    }

    public function test_admin_can_publish_and_unpublish_a_programme(): void
    {
        $programme = $this->publishableProgramme();

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-programmes/{$programme->id}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-programmes/{$programme->id}/unpublish")
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');
    }

    /**
     * A programme with nothing in it would appear in the student app as an empty
     * course, so publishing one is refused.
     */
    public function test_an_empty_programme_cannot_be_published(): void
    {
        $programme = CourseProgramme::factory()->create(['course_category_id' => $this->category->id]);

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-programmes/{$programme->id}/publish")
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertSame(CourseStatus::Draft, $programme->fresh()->status);
    }

    /**
     * A lesson with no file cannot be played, and one with no duration can never
     * be completed — `CourseProgressService` has nothing to measure 95% against,
     * so a student could never unlock the assessment. Both are caught at publish
     * rather than being discovered by a student.
     */
    public function test_a_programme_with_an_incomplete_lesson_cannot_be_published(): void
    {
        $programme = CourseProgramme::factory()->create(['course_category_id' => $this->category->id]);
        CourseVideo::factory()->for(
            CourseTopic::factory()->create(['course_programme_id' => $programme->id]),
            'topic',
        )->create(['title' => 'Intro', 'duration_seconds' => null]);

        $this->actingAs($this->contentManager)
            ->postJson("/api/v1/admin/course-programmes/{$programme->id}/publish")
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    /** A programme whose single lesson has a real file and a known duration. */
    private function publishableProgramme(): CourseProgramme
    {
        $programme = CourseProgramme::factory()->create(['course_category_id' => $this->category->id]);

        $video = CourseVideo::factory()->for(
            CourseTopic::factory()->create(['course_programme_id' => $programme->id]),
            'topic',
        )->create(['duration_seconds' => 600]);

        // A minimal but genuine MP4 header — Media Library validates the mime type.
        $path = tempnam(sys_get_temp_dir(), 'planb_test_mp4_').'.mp4';
        file_put_contents(
            $path,
            pack('N', 32).'ftypisom'.pack('N', 512).'isomiso2avc1mp41'.str_repeat("\0", 4096),
        );

        $video->addMedia($path)
            ->usingFileName('lesson.mp4')
            ->toMediaCollection(CourseVideo::VIDEO_COLLECTION);

        return $programme;
    }

    public function test_deleting_a_programme_is_recoverable(): void
    {
        $programme = CourseProgramme::factory()->create(['course_category_id' => $this->category->id]);
        CourseVideo::factory()->for(
            CourseTopic::factory()->create(['course_programme_id' => $programme->id]),
            'topic'
        )->create();

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/v1/admin/course-programmes/{$programme->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('course_programmes', ['id' => $programme->id]);
        $this->assertDatabaseCount('course_videos', 1);
    }

    public function test_only_a_super_admin_can_delete_a_programme(): void
    {
        $programme = CourseProgramme::factory()->create(['course_category_id' => $this->category->id]);

        $this->actingAs($this->contentManager)
            ->deleteJson("/api/v1/admin/course-programmes/{$programme->id}")
            ->assertForbidden();
    }

    public function test_programmes_can_be_filtered_by_category_and_status(): void
    {
        $otherCategory = CourseCategory::factory()->create();
        CourseProgramme::factory()->published()->create([
            'course_category_id' => $this->category->id,
            'name' => 'Published here',
        ]);
        CourseProgramme::factory()->create(['course_category_id' => $this->category->id, 'name' => 'Draft here']);
        CourseProgramme::factory()->create(['course_category_id' => $otherCategory->id, 'name' => 'Elsewhere']);

        $this->actingAs($this->accountant)
            ->getJson("/api/v1/admin/course-programmes?course_category_id={$this->category->id}&status=published")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Published here');
    }

    public function test_the_list_reports_topic_and_video_counts(): void
    {
        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/admin/course-programmes', $this->payload())
            ->assertCreated();

        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/course-programmes')
            ->assertOk()
            ->assertJsonPath('data.0.topics_count', 2)
            ->assertJsonPath('data.0.videos_count', 3);
    }
}
