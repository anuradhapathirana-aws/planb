<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_items', function (Blueprint $table): void {
            $table->id();
            // App\Enums\ChecklistPhase — before_arrival | after_arrival.
            $table->string('phase', 32);
            $table->string('title');
            // Sanitized rich-text HTML (App\Support\HtmlSanitizer), same as topic descriptions.
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            // Every read is "one phase, in order", which is exactly this index.
            $table->index(['phase', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checklist_items');
    }
};
