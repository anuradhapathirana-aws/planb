<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Turns the Home banner singleton into the Home carousel.
 *
 * This is the change `create_home_banners_table` said it would be: "a
 * `sort_order` column and a list endpoint". The table was already plural and
 * the "exactly one row" rule only ever lived in `HomeBannerService`, never in
 * the schema — so there is nothing to migrate, no second table, and the
 * client's uploaded image keeps its Media Library rows untouched. An existing
 * banner simply becomes the first slide.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_banners', function (Blueprint $table): void {
            /*
             * Position in the carousel, low to high. Indexed with `is_active`
             * because the student endpoint only ever asks one question of this
             * table: "the live slides, in order".
             */
            $table->unsignedSmallInteger('sort_order')->default(0)->after('is_active');

            $table->index(['is_active', 'sort_order'], 'home_banners_live_order_index');
        });

        // The pre-existing singleton, if there is one, is slide 1.
        DB::table('home_banners')->update(['sort_order' => 0]);
    }

    public function down(): void
    {
        Schema::table('home_banners', function (Blueprint $table): void {
            $table->dropIndex('home_banners_live_order_index');
            $table->dropColumn('sort_order');
        });
    }
};
