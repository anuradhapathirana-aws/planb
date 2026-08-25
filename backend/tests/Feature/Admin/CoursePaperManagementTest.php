<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\RoleName;
use App\Models\CoursePaper;
use App\Models\CourseProgramme;
use App\Models\CourseQuestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CoursePaperManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $contentManager;

    private User $accountant;

    private CourseProgramme $programme;

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

        $this->programme = CourseProgramme::factory()->create();
    }

    private function url(): string
    {
        return "/api/v1/admin/course-programmes/{$this->programme->id}/paper";
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Phase 1 — Final assessment',
            'instructions' => '<p>Answer every question. See the <a href="https://planb.lk">guide</a>.</p>',
            'pass_mark' => 70,
            'max_attempts' => null,
            'requires_all_videos_watched' => true,
            'questions' => [
                [
                    'text' => 'How many hours is a standard UAE work week?',
                    'type' => 'multiple_choice',
                    'options' => [
                        ['text' => '40 hours', 'is_correct' => false],
                        ['text' => '48 hours', 'is_correct' => true],
                        ['text' => '54 hours', 'is_correct' => false],
                    ],
                ],
                [
                    'text' => 'Is a medical test required before a UAE work visa?',
                    'type' => 'yes_no',
                    'options' => [
                        ['text' => 'Yes', 'is_correct' => true],
                        ['text' => 'No', 'is_correct' => false],
                    ],
                ],
            ],
        ], $overrides);
    }

    public function test_guest_cannot_read_a_paper(): void
    {
        $this->getJson($this->url())->assertUnauthorized();
    }

    /** A programme with no paper is a normal state, not an error. */
    public function test_a_programme_without_a_paper_returns_null(): void
    {
        $this->actingAs($this->contentManager)
            ->getJson($this->url())
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_admin_can_create_a_paper_with_questions_and_answers(): void
    {
        $this->actingAs($this->contentManager)
            ->putJson($this->url(), $this->payload())
            ->assertOk()
            ->assertJsonPath('data.title', 'Phase 1 — Final assessment')
            ->assertJsonPath('data.pass_mark', 70)
            ->assertJsonPath('data.max_attempts', null)
            ->assertJsonPath('data.requires_all_videos_watched', true)
            ->assertJsonCount(2, 'data.questions')
            ->assertJsonPath('data.questions.0.type', 'multiple_choice')
            ->assertJsonCount(3, 'data.questions.0.options')
            ->assertJsonPath('data.questions.0.options.1.is_correct', true)
            ->assertJsonPath('data.questions.1.type', 'yes_no');

        $this->assertDatabaseCount('course_papers', 1);
        $this->assertDatabaseCount('course_questions', 2);
        $this->assertDatabaseCount('course_question_options', 5);
    }

    public function test_saving_again_replaces_the_paper_rather_than_adding_a_second(): void
    {
        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();
        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();

        $this->assertDatabaseCount('course_papers', 1);
    }

    public function test_questions_and_options_keep_the_submitted_order(): void
    {
        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $this->payload())
            ->assertOk()
            ->assertJsonPath('data.questions.0.sort_order', 0)
            ->assertJsonPath('data.questions.1.sort_order', 1)
            ->assertJsonPath('data.questions.0.options.2.sort_order', 2);
    }

    public function test_instructions_are_sanitized_before_storage(): void
    {
        $payload = $this->payload([
            'instructions' => '<p onclick="steal()">Read this<script>alert(1)</script></p>'
                .'<a href="javascript:alert(1)">bad</a><a href="https://planb.lk" target="_blank">good</a>',
        ]);

        $this->actingAs($this->superAdmin)->putJson($this->url(), $payload)->assertOk();

        $instructions = CoursePaper::query()->value('instructions');

        $this->assertStringNotContainsString('script', $instructions);
        $this->assertStringNotContainsString('onclick', $instructions);
        $this->assertStringNotContainsString('javascript:', $instructions);
        $this->assertStringContainsString('https://planb.lk', $instructions);
    }

    public function test_a_paper_needs_at_least_one_question(): void
    {
        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $this->payload(['questions' => []]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('questions');
    }

    public function test_a_question_needs_at_least_two_answers(): void
    {
        $payload = $this->payload();
        $payload['questions'][0]['options'] = [['text' => 'Only one', 'is_correct' => true]];

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('questions.0.options');
    }

    public function test_a_question_must_have_exactly_one_correct_answer(): void
    {
        $payload = $this->payload();
        $payload['questions'][0]['options'] = [
            ['text' => 'A', 'is_correct' => false],
            ['text' => 'B', 'is_correct' => false],
        ];

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('questions.0.options');
    }

    public function test_a_question_cannot_have_two_correct_answers(): void
    {
        $payload = $this->payload();
        $payload['questions'][0]['options'] = [
            ['text' => 'A', 'is_correct' => true],
            ['text' => 'B', 'is_correct' => true],
        ];

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('questions.0.options');
    }

    public function test_a_yes_no_question_must_have_exactly_two_answers(): void
    {
        $payload = $this->payload();
        $payload['questions'][1]['options'] = [
            ['text' => 'Yes', 'is_correct' => true],
            ['text' => 'No', 'is_correct' => false],
            ['text' => 'Maybe', 'is_correct' => false],
        ];

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('questions.1.options');
    }

    public function test_the_pass_mark_must_be_a_percentage(): void
    {
        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $this->payload(['pass_mark' => 140]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('pass_mark');
    }

    public function test_a_retry_limit_can_be_set(): void
    {
        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $this->payload(['max_attempts' => 3]))
            ->assertOk()
            ->assertJsonPath('data.max_attempts', 3);
    }

    public function test_editing_keeps_existing_questions_and_drops_removed_ones(): void
    {
        $created = $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $this->payload())
            ->assertOk()
            ->json('data');

        $firstQuestion = $created['questions'][0];
        $keptOptionId = $firstQuestion['options'][0]['id'];

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $this->payload([
                'questions' => [
                    [
                        'id' => $firstQuestion['id'],
                        'text' => 'How many hours is a standard UAE work week? (revised)',
                        'type' => 'multiple_choice',
                        'options' => [
                            ['id' => $keptOptionId, 'text' => '40 hours', 'is_correct' => false],
                            ['text' => '48 hours', 'is_correct' => true],
                        ],
                    ],
                ],
            ]))
            ->assertOk()
            ->assertJsonCount(1, 'data.questions')
            ->assertJsonPath('data.questions.0.id', $firstQuestion['id'])
            ->assertJsonPath('data.questions.0.text', 'How many hours is a standard UAE work week? (revised)')
            ->assertJsonCount(2, 'data.questions.0.options')
            ->assertJsonPath('data.questions.0.options.0.id', $keptOptionId);

        $this->assertDatabaseCount('course_questions', 1);
        $this->assertDatabaseCount('course_question_options', 2);
    }

    public function test_saving_cannot_adopt_a_question_from_another_paper(): void
    {
        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();

        $foreignQuestion = CourseQuestion::factory()->create();

        $payload = $this->payload();
        $payload['questions'][0]['id'] = $foreignQuestion->id;

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('questions.0.id');
    }

    public function test_a_role_without_content_rights_cannot_save_a_paper(): void
    {
        $this->actingAs($this->accountant)
            ->putJson($this->url(), $this->payload())
            ->assertForbidden();
    }

    public function test_any_admin_role_can_read_a_paper(): void
    {
        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();

        $this->actingAs($this->accountant)
            ->getJson($this->url())
            ->assertOk()
            ->assertJsonCount(2, 'data.questions');
    }

    public function test_admin_can_delete_a_paper(): void
    {
        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();

        $this->actingAs($this->contentManager)->deleteJson($this->url())->assertNoContent();

        $this->assertDatabaseCount('course_papers', 0);
        $this->assertDatabaseCount('course_questions', 0);
        $this->assertDatabaseCount('course_question_options', 0);
    }

    public function test_deleting_a_paper_that_does_not_exist_is_a_404(): void
    {
        $this->actingAs($this->contentManager)->deleteJson($this->url())->assertNotFound();
    }

    /** Drives the "N questions" badge on the Courses list and Course form. */
    public function test_the_programme_payload_reports_its_paper(): void
    {
        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();

        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/course-programmes')
            ->assertOk()
            ->assertJsonPath('data.0.paper.questions_count', 2)
            ->assertJsonPath('data.0.paper.pass_mark', 70);

        $this->actingAs($this->superAdmin)
            ->getJson("/api/v1/admin/course-programmes/{$this->programme->id}")
            ->assertOk()
            ->assertJsonPath('data.paper.questions_count', 2);
    }

    public function test_a_programme_without_a_paper_reports_null(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/course-programmes')
            ->assertOk()
            ->assertJsonPath('data.0.paper', null);
    }

    public function test_deleting_the_programme_removes_its_paper(): void
    {
        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();

        // Programmes are soft-deleted, so the paper survives with them — the
        // cascade only fires on a real delete.
        $this->programme->forceDelete();

        $this->assertDatabaseCount('course_papers', 0);
        $this->assertDatabaseCount('course_questions', 0);
    }
}
