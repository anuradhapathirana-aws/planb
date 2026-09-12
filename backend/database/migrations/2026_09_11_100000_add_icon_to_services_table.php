<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            /*
             * One of `App\Enums\ServiceIcon`, stored as its name rather than as
             * an uploaded file — see that enum for why.
             *
             * Nullable, and no default: every service that existed before this
             * column keeps a null, and the app falls back to the `other` glyph.
             * Backfilling them all to `other` would have written a deliberate
             * choice into rows where nobody made one, which matters the day an
             * admin wants to find the services still needing an icon.
             */
            $table->string('icon', 40)->nullable()->after('summary');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            $table->dropColumn('icon');
        });
    }
};
