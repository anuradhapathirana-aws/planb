<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_categories', function (Blueprint $table): void {
            /*
             * One of `App\Enums\CourseCategoryIcon`, stored as its meaning — see
             * that enum.
             *
             * Nullable with no default, like `services.icon`: every existing
             * category keeps a null, which the app reads as "no choice yet" and
             * answers by guessing a glyph from the category name, so nothing
             * changes on screen until an admin picks one. Backfilling a value
             * would have written a decision into rows where nobody made one.
             */
            $table->string('icon', 40)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('course_categories', function (Blueprint $table): void {
            $table->dropColumn('icon');
        });
    }
};
