<?php

declare(strict_types=1);

use App\Enums\CourseStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * When a course first became available to students.
 *
 * `status` alone cannot answer "what is new?" — it is a flag with no history, so
 * a course published in January and one published this morning are
 * indistinguishable. The app's Home search needs that distinction for its "New"
 * tab.
 *
 * Set on the FIRST publish only and never touched again (see
 * `CourseProgrammeService::publish`). An admin who unpublishes a course to fix a
 * lesson and republishes it a week later has not created a new course, and it
 * should not jump back to the top of a student's "New" list.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_programmes', function (Blueprint $table): void {
            $table->timestamp('published_at')->nullable()->after('status');

            // "Published, newest first" is the only read, and it is exactly this.
            $table->index(['status', 'published_at']);
        });

        /*
         * Backfill from `created_at`, not `updated_at`.
         *
         * `updated_at` would be the more accurate guess at when a course went
         * live, but it also moves every time an admin fixes a typo — so a course
         * from January edited yesterday would surface as "new" to every student.
         * `created_at` can only ever be too old, which fails quietly instead.
         */
        DB::table('course_programmes')
            ->where('status', CourseStatus::Published->value)
            ->whereNull('published_at')
            ->update(['published_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('course_programmes', function (Blueprint $table): void {
            $table->dropIndex(['status', 'published_at']);
            $table->dropColumn('published_at');
        });
    }
};
