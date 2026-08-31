<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_programmes', function (Blueprint $table): void {
            // Smallest currency unit as an integer, never a float (CLAUDE.md §4.11).
            // 0 means free: the student is enrolled instantly with no order at all.
            $table->unsignedBigInteger('price_cents')->default(0)->after('description');
            $table->char('currency', 3)->default('LKR')->after('price_cents');
        });
    }

    public function down(): void
    {
        Schema::table('course_programmes', function (Blueprint $table): void {
            $table->dropColumn(['price_cents', 'currency']);
        });
    }
};
