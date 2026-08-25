<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\ChecklistPhase;
use App\Enums\RoleName;
use App\Models\ChecklistItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ChecklistManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $contentManager;

    private User $accountant;

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
    }

    private function url(ChecklistPhase $phase = ChecklistPhase::BeforeArrival): string
    {
        return "/api/v1/admin/checklists/{$phase->value}";
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'items' => [
                [
                    'title' => 'Valid passport (6+ months)',
                    'description' => '<p>Check the expiry date on page one.</p>',
                ],
                [
                    'title' => 'Police clearance certificate',
                    'description' => null,
                ],
            ],
        ], $overrides);
    }

    public function test_guest_cannot_read_a_checklist(): void
    {
        $this->getJson($this->url())->assertUnauthorized();
    }

    public function test_an_empty_checklist_returns_an_empty_list(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson($this->url())
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_an_unknown_phase_is_not_found(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/checklists/on_arrival')
            ->assertNotFound();
    }

    public function test_any_admin_role_can_read_a_checklist(): void
    {
        ChecklistItem::factory()->create(['title' => 'Valid passport']);

        $this->actingAs($this->accountant)
            ->getJson($this->url())
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Valid passport')
            ->assertJsonPath('data.0.phase', 'before_arrival');
    }

    public function test_a_content_manager_can_save_a_checklist(): void
    {
        $this->actingAs($this->contentManager)
            ->putJson($this->url(), $this->payload())
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'Valid passport (6+ months)')
            ->assertJsonPath('data.1.description', null);

        $this->assertDatabaseCount('checklist_items', 2);
    }

    public function test_an_accountant_cannot_save_a_checklist(): void
    {
        $this->actingAs($this->accountant)
            ->putJson($this->url(), $this->payload())
            ->assertForbidden();

        $this->assertDatabaseCount('checklist_items', 0);
    }

    /** Position in the submitted array is the stored order. */
    public function test_saving_stores_the_submitted_order(): void
    {
        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();

        $this->assertSame(
            [0, 1],
            ChecklistItem::query()->orderBy('sort_order')->pluck('sort_order')->all()
        );
    }

    public function test_reordering_updates_rows_in_place_instead_of_recreating_them(): void
    {
        $response = $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload());
        $first = $response->json('data.0.id');
        $second = $response->json('data.1.id');

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), ['items' => [
                ['id' => $second, 'title' => 'Police clearance certificate', 'description' => null],
                ['id' => $first, 'title' => 'Valid passport (6+ months)', 'description' => null],
            ]])
            ->assertOk()
            ->assertJsonPath('data.0.id', $second)
            ->assertJsonPath('data.1.id', $first);

        $this->assertDatabaseCount('checklist_items', 2);
    }

    public function test_items_dropped_from_the_payload_are_deleted(): void
    {
        $response = $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload());
        $first = $response->json('data.0.id');

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), ['items' => [
                ['id' => $first, 'title' => 'Valid passport (6+ months)', 'description' => null],
            ]])
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertDatabaseCount('checklist_items', 1);
    }

    /** Clearing a tab is a legitimate state, unlike a Q&A paper with no questions. */
    public function test_a_checklist_can_be_emptied(): void
    {
        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), ['items' => []])
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->assertDatabaseCount('checklist_items', 0);
    }

    /** Saving one tab must not touch the other. */
    public function test_saving_one_phase_leaves_the_other_untouched(): void
    {
        $after = ChecklistItem::factory()
            ->phase(ChecklistPhase::AfterArrival)
            ->create(['title' => 'Open a UAE bank account']);

        $this->actingAs($this->superAdmin)->putJson($this->url(), $this->payload())->assertOk();

        $this->assertDatabaseHas('checklist_items', ['id' => $after->id, 'title' => 'Open a UAE bank account']);

        $this->actingAs($this->superAdmin)
            ->getJson($this->url(ChecklistPhase::AfterArrival))
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    /** An id from the other tab is a 422, not a silent move across phases. */
    public function test_an_item_id_from_another_phase_is_rejected(): void
    {
        $after = ChecklistItem::factory()->phase(ChecklistPhase::AfterArrival)->create();

        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), ['items' => [
                ['id' => $after->id, 'title' => 'Stolen row', 'description' => null],
            ]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.id');
    }

    public function test_an_item_without_a_title_fails_validation(): void
    {
        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), ['items' => [['title' => '', 'description' => null]]])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.title');
    }

    public function test_the_items_key_is_required(): void
    {
        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    /** Descriptions are admin-authored HTML and are never stored as received. */
    public function test_the_description_is_sanitized_on_save(): void
    {
        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), ['items' => [[
                'title' => 'Medical report',
                'description' => '<p>Book it <strong>early</strong>.</p><script>alert(1)</script>'
                    .'<a href="javascript:alert(1)">tap</a>',
            ]]])
            ->assertOk();

        $description = ChecklistItem::query()->value('description');

        $this->assertStringNotContainsString('<script', $description);
        $this->assertStringNotContainsString('javascript:', $description);
        $this->assertStringContainsString('<strong>early</strong>', $description);
    }

    /** An editor emptied of content still emits an empty paragraph — not a description. */
    public function test_an_empty_editor_document_is_stored_as_null(): void
    {
        $this->actingAs($this->superAdmin)
            ->putJson($this->url(), ['items' => [
                ['title' => 'Flight ticket', 'description' => '<p></p>'],
            ]])
            ->assertOk()
            ->assertJsonPath('data.0.description', null);
    }
}
