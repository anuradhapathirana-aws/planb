<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\ChecklistPhase;
use App\Models\ChecklistItem;
use App\Models\ChecklistItemPoint;
use App\Models\Student;
use App\Models\StudentChecklistItem;
use App\Models\StudentChecklistItemPoint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The student side of the arrival checklists. Guard isolation for these routes
 * is covered once, for the whole student API, in GuardIsolationTest.
 */
class StudentChecklistTest extends TestCase
{
    use RefreshDatabase;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = Student::factory()->create(['is_blocked' => false]);
        Sanctum::actingAs($this->student, ['student'], 'student');
    }

    private function item(ChecklistPhase $phase, string $title, int $sortOrder = 0): ChecklistItem
    {
        return ChecklistItem::factory()->phase($phase)->create([
            'title' => $title,
            'sort_order' => $sortOrder,
        ]);
    }

    public function test_every_phase_comes_back_in_journey_order_with_items_sorted(): void
    {
        $this->item(ChecklistPhase::AfterArrival, 'Open a bank account');
        $this->item(ChecklistPhase::Baggage, 'Phone charger');
        $this->item(ChecklistPhase::BeforeArrival, 'Book your medical', 1);
        $this->item(ChecklistPhase::BeforeArrival, 'Renew your passport', 0);

        $this->getJson('/api/v1/student/checklists')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.phase', 'before_arrival')
            ->assertJsonPath('data.0.items.0.title', 'Renew your passport')
            ->assertJsonPath('data.0.items.1.title', 'Book your medical')
            ->assertJsonPath('data.1.phase', 'baggage')
            ->assertJsonPath('data.1.items.0.title', 'Phone charger')
            ->assertJsonPath('data.2.phase', 'after_arrival')
            ->assertJsonPath('data.2.items.0.title', 'Open a bank account');
    }

    public function test_ticking_a_baggage_item_moves_only_the_baggage_progress(): void
    {
        $item = $this->item(ChecklistPhase::Baggage, 'Phone charger');
        $this->item(ChecklistPhase::BeforeArrival, 'Renew your passport');

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => true])
            ->assertOk()
            ->assertJsonPath('data.progress.phase', 'baggage')
            ->assertJsonPath('data.progress.percent_complete', 100);

        $this->getJson('/api/v1/student/checklists')
            ->assertJsonPath('data.0.progress.completed', 0)
            ->assertJsonPath('data.1.progress.completed', 1);
    }

    /** A phase an admin has not authored yet is an empty list, never a 404. */
    public function test_an_empty_phase_reports_zero_percent_rather_than_complete(): void
    {
        $this->getJson('/api/v1/student/checklists')
            ->assertOk()
            ->assertJsonPath('data.0.items', [])
            ->assertJsonPath('data.0.progress', [
                'completed' => 0,
                'total' => 0,
                'percent_complete' => 0,
            ]);
    }

    public function test_progress_counts_only_the_signed_in_students_ticks(): void
    {
        $first = $this->item(ChecklistPhase::BeforeArrival, 'Renew your passport', 0);
        $second = $this->item(ChecklistPhase::BeforeArrival, 'Book your medical', 1);

        StudentChecklistItem::create([
            'student_id' => $this->student->id,
            'checklist_item_id' => $first->id,
            'completed_at' => now(),
        ]);

        // Another student ticking a step must not move this one's ring.
        StudentChecklistItem::create([
            'student_id' => Student::factory()->create()->id,
            'checklist_item_id' => $second->id,
            'completed_at' => now(),
        ]);

        $this->getJson('/api/v1/student/checklists')
            ->assertOk()
            ->assertJsonPath('data.0.items.0.is_completed', true)
            ->assertJsonPath('data.0.items.1.is_completed', false)
            ->assertJsonPath('data.0.progress.completed', 1)
            ->assertJsonPath('data.0.progress.total', 2)
            ->assertJsonPath('data.0.progress.percent_complete', 50);
    }

    public function test_ticking_a_step_records_it_and_returns_the_recomputed_phase_progress(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Renew your passport');

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => true])
            ->assertOk()
            ->assertJsonPath('data.item.is_completed', true)
            ->assertJsonPath('data.progress.phase', 'before_arrival')
            ->assertJsonPath('data.progress.percent_complete', 100);

        $this->assertNotNull(
            StudentChecklistItem::query()
                ->where('student_id', $this->student->id)
                ->where('checklist_item_id', $item->id)
                ->sole()
                ->completed_at,
        );
    }

    /** Un-ticking keeps the row and nulls the timestamp — see the migration. */
    public function test_unticking_clears_the_timestamp_without_deleting_the_row(): void
    {
        $item = $this->item(ChecklistPhase::AfterArrival, 'Open a bank account');

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => true])
            ->assertOk();

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => false])
            ->assertOk()
            ->assertJsonPath('data.item.is_completed', false)
            ->assertJsonPath('data.item.completed_at', null)
            ->assertJsonPath('data.progress.percent_complete', 0);

        $progress = StudentChecklistItem::query()->where('checklist_item_id', $item->id)->sole();

        $this->assertNull($progress->completed_at);
    }

    /** The client sends the state it wants, so a retried request is a no-op. */
    public function test_ticking_twice_is_idempotent(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Renew your passport');

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => true])
            ->assertOk();

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => true])
            ->assertOk()
            ->assertJsonPath('data.progress.completed', 1);

        $this->assertSame(1, StudentChecklistItem::query()->count());
    }

    public function test_is_completed_is_required_and_must_be_a_boolean(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Renew your passport');

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_completed');

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => 'maybe'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_completed');
    }

    public function test_an_unknown_step_is_a_404(): void
    {
        $this->putJson('/api/v1/student/checklist-items/99999', ['is_completed' => true])
            ->assertNotFound();
    }

    /** @return list<ChecklistItemPoint> */
    private function points(ChecklistItem $item, string ...$titles): array
    {
        return array_map(
            fn (int $order, string $title) => $item->points()->create(['title' => $title, 'sort_order' => $order]),
            array_keys($titles),
            $titles,
        );
    }

    public function test_a_step_lists_its_checking_points_in_order(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Gather documents');
        $item->points()->create(['title' => 'Birth certificate', 'sort_order' => 1]);
        $item->points()->create(['title' => 'Passport copy', 'sort_order' => 0]);

        $this->getJson('/api/v1/student/checklists')
            ->assertOk()
            ->assertJsonPath('data.0.items.0.points.0.title', 'Passport copy')
            ->assertJsonPath('data.0.items.0.points.0.is_completed', false)
            ->assertJsonPath('data.0.items.0.points.1.title', 'Birth certificate');
    }

    public function test_a_step_stays_open_until_its_last_point_is_ticked(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Gather documents');
        [$first, $second] = $this->points($item, 'Passport copy', 'Birth certificate');

        $this->putJson("/api/v1/student/checklist-points/{$first->id}", ['is_completed' => true])
            ->assertOk()
            ->assertJsonPath('data.item.id', $item->id)
            ->assertJsonPath('data.item.points.0.is_completed', true)
            ->assertJsonPath('data.item.is_completed', false)
            ->assertJsonPath('data.progress.completed', 0);

        $this->putJson("/api/v1/student/checklist-points/{$second->id}", ['is_completed' => true])
            ->assertOk()
            ->assertJsonPath('data.item.is_completed', true)
            ->assertJsonPath('data.progress.completed', 1)
            ->assertJsonPath('data.progress.percent_complete', 100);

        // Un-ticking any point reopens the step.
        $this->putJson("/api/v1/student/checklist-points/{$first->id}", ['is_completed' => false])
            ->assertOk()
            ->assertJsonPath('data.item.is_completed', false)
            ->assertJsonPath('data.item.completed_at', null)
            ->assertJsonPath('data.progress.completed', 0);
    }

    /** Ticking a step that has points ticks every point — one tap for "done it all". */
    public function test_ticking_a_step_with_points_ticks_and_clears_all_of_them(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Gather documents');
        $this->points($item, 'Passport copy', 'Birth certificate');

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => true])
            ->assertOk()
            ->assertJsonPath('data.item.is_completed', true)
            ->assertJsonPath('data.item.points.0.is_completed', true)
            ->assertJsonPath('data.item.points.1.is_completed', true);

        $this->assertSame(0, StudentChecklistItem::query()->count());

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => false])
            ->assertOk()
            ->assertJsonPath('data.item.is_completed', false)
            ->assertJsonPath('data.item.points.1.is_completed', false);
    }

    /** Completion is derived on read, so a point added later reopens a finished step. */
    public function test_a_point_added_to_a_finished_step_reopens_it(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Gather documents');
        [$point] = $this->points($item, 'Passport copy');

        $this->putJson("/api/v1/student/checklist-points/{$point->id}", ['is_completed' => true])
            ->assertJsonPath('data.item.is_completed', true);

        $item->points()->create(['title' => 'Birth certificate', 'sort_order' => 1]);

        $this->getJson('/api/v1/student/checklists')
            ->assertJsonPath('data.0.items.0.is_completed', false)
            ->assertJsonPath('data.0.progress.completed', 0);
    }

    public function test_point_ticks_are_scoped_to_the_signed_in_student(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Gather documents');
        [$point] = $this->points($item, 'Passport copy');

        StudentChecklistItemPoint::create([
            'student_id' => Student::factory()->create()->id,
            'checklist_item_point_id' => $point->id,
            'completed_at' => now(),
        ]);

        $this->getJson('/api/v1/student/checklists')
            ->assertJsonPath('data.0.items.0.points.0.is_completed', false)
            ->assertJsonPath('data.0.items.0.is_completed', false);
    }

    public function test_an_unknown_point_is_a_404(): void
    {
        $this->putJson('/api/v1/student/checklist-points/99999', ['is_completed' => true])
            ->assertNotFound();
    }

    public function test_a_point_tick_requires_is_completed(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Gather documents');
        [$point] = $this->points($item, 'Passport copy');

        $this->putJson("/api/v1/student/checklist-points/{$point->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_completed');
    }

    /** An admin dropping a step from a phase takes its progress with it. */
    public function test_deleting_a_step_cascades_the_students_progress_away(): void
    {
        $item = $this->item(ChecklistPhase::BeforeArrival, 'Renew your passport');

        $this->putJson("/api/v1/student/checklist-items/{$item->id}", ['is_completed' => true])
            ->assertOk();

        $item->delete();

        $this->assertSame(0, StudentChecklistItem::query()->count());
    }
}
