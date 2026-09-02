<?php

declare(strict_types=1);

namespace Tests\Feature\Student;

use App\Enums\ChecklistPhase;
use App\Models\ChecklistItem;
use App\Models\Student;
use App\Models\StudentChecklistItem;
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

    public function test_both_phases_come_back_in_enum_order_with_items_sorted(): void
    {
        $this->item(ChecklistPhase::AfterArrival, 'Open a bank account');
        $this->item(ChecklistPhase::BeforeArrival, 'Book your medical', 1);
        $this->item(ChecklistPhase::BeforeArrival, 'Renew your passport', 0);

        $this->getJson('/api/v1/student/checklists')
            ->assertOk()
            ->assertJsonPath('data.0.phase', 'before_arrival')
            ->assertJsonPath('data.0.items.0.title', 'Renew your passport')
            ->assertJsonPath('data.0.items.1.title', 'Book your medical')
            ->assertJsonPath('data.1.phase', 'after_arrival')
            ->assertJsonPath('data.1.items.0.title', 'Open a bank account');
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
