<?php

declare(strict_types=1);

use App\Enums\VideoProcessingStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_videos', function (Blueprint $table): void {
            // Bunny's video guid. `external_url` stays for a genuinely external
            // link (a plain URL someone pastes in); this is a host-managed id we
            // build a signed URL from at play time, which is not the same thing.
            $table->string('external_id')->nullable()->after('external_url');

            // A Bunny upload is not playable until transcoding finishes, so a
            // lesson now has a readiness of its own. Locally uploaded files are
            // written as `ready` immediately — there is nothing to wait for.
            $table->string('processing_status')
                ->default(VideoProcessingStatus::Ready->value)
                ->after('external_id');

            $table->index('external_id');
        });
    }

    public function down(): void
    {
        Schema::table('course_videos', function (Blueprint $table): void {
            $table->dropIndex(['external_id']);
            $table->dropColumn(['external_id', 'processing_status']);
        });
    }
};
