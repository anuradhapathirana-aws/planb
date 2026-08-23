<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Replaces the free-text `profession_category` (FR-ADM-012's original "plain
 * string for now" placeholder, see docs/schema.md) with proper foreign keys
 * into the new admin-managed `industries` / `professions` master data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('profession_category');
            $table->foreignId('industry_id')->nullable()->after('highest_qualification')->constrained('industries')->nullOnDelete();
            $table->foreignId('profession_id')->nullable()->after('industry_id')->constrained('professions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropConstrainedForeignId('profession_id');
            $table->dropConstrainedForeignId('industry_id');
            $table->string('profession_category')->nullable()->after('highest_qualification');
        });
    }
};
