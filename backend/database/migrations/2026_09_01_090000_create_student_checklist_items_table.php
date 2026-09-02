<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which arrival-checklist steps a student has ticked off.
 *
 * The row is kept when a student un-ticks rather than deleted: `completed_at`
 * goes back to null. That keeps "when did they actually finish this step" —
 * the only interesting thing here for reporting — and makes a tick or an untick
 * the same idempotent upsert instead of an insert-or-delete branch.
 *
 * An item an admin removes from a phase takes its progress with it (the phase
 * is saved as one document, see `ChecklistItemService::sync`), which is why the
 * foreign key cascades rather than nulls.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_checklist_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('checklist_item_id')->constrained()->cascadeOnDelete();

            // Null means "seen but not done" — the row exists, the step doesn't.
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            // One row per student per step. Also the index every read uses:
            // "this student's progress across a phase's items".
            $table->unique(['student_id', 'checklist_item_id']);
            $table->index(['student_id', 'completed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_checklist_items');
    }
};
