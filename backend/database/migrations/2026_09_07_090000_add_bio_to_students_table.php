<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A short "about me", written by the student, shown on their profile header.
 *
 * `text` rather than `string(500)`: the 500-character cap is a UX decision about
 * how much fits under an avatar, and it belongs in the Form Request where it can
 * be relaxed without a migration. The column is not indexed and never searched.
 *
 * Student-writable only. It is absent from the admin `UpdateStudentRequest` on
 * purpose — this is the student's own words about themselves, and an admin
 * editing them would be putting words in their mouth on a record that feeds visa
 * paperwork.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->text('bio')->nullable()->after('highest_qualification');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->dropColumn('bio');
        });
    }
};
