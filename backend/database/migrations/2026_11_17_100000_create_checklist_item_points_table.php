<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The checking points under one checklist item — the sub-list a student ticks
 * through before the item itself counts as done.
 *
 * Optional per item: an item with no points is ticked directly, exactly as
 * before. Points are saved as part of their phase (see
 * `ChecklistItemService::sync`), so they cascade with the item.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_item_points', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('checklist_item_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            // Optional sanitized rich-text HTML (App\Support\HtmlSanitizer), same as the item's.
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            // Every read is "this item's points, in order".
            $table->index(['checklist_item_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_item_points');
    }
};
