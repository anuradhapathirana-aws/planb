<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Course bundles: a category's courses are sold either one by one, or together
 * as a bundle. Every course is sold exactly one way — see `App\Enums\SellingMode`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_categories', function (Blueprint $table): void {
            // `App\Enums\SellingMode`. Main categories: `single` or `bundle`.
            // Sub-categories: `inherit` (follow the main category), `single` or
            // `bundle` (a bundle of their own). `single` keeps every existing main
            // category selling exactly as it does today.
            $table->string('selling_mode', 10)->default('single')->after('icon');
        });

        // Existing sub-categories follow their main category — which sells one by
        // one — so nothing changes on screen.
        DB::table('course_categories')->whereNotNull('parent_id')->update(['selling_mode' => 'inherit']);

        /*
         * What an order is FOR, frozen at the moment it was opened.
         *
         * A bundle's contents and price depend on the student (courses they
         * already own are left out) and on the catalogue at that moment. A bank
         * transfer can wait days for approval; without this, an admin adding a
         * course or changing a price in between would change what the student
         * receives from what they paid for. Settlement enrols exactly these rows.
         */
        Schema::create('order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            // Restrict: courses are soft-deleted, so a paid-for row always resolves.
            $table->foreignId('course_programme_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('price_cents');
            $table->string('title_snapshot');
            $table->timestamps();

            $table->unique(['order_id', 'course_programme_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');

        Schema::table('course_categories', function (Blueprint $table): void {
            $table->dropColumn('selling_mode');
        });
    }
};
