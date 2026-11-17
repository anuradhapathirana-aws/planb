<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which checking points a student has ticked — the point-level twin of
 * `student_checklist_items`, with the same keep-the-row-on-untick rule.
 *
 * An item's own "done" state is never stored for an item that has points: it is
 * derived from these rows on read, so an admin adding a point to a finished item
 * correctly reopens it without any data to repair.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_checklist_item_points', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('checklist_item_point_id')->constrained()->cascadeOnDelete();

            // Null means "un-ticked" — the row survives, see the item-level table.
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            // One row per student per point. Named explicitly: the generated name
            // is past MySQL's 64-character identifier limit.
            $table->unique(['student_id', 'checklist_item_point_id'], 'student_checklist_points_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_checklist_item_points');
    }
};
