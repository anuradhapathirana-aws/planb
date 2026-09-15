<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /*
     * The one-line catalogue summary is gone at the client's request: the app
     * shows the name, the image and the full "What the student gets"
     * description, and the summary only repeated the last in fewer words.
     *
     * Destructive — existing summaries are deleted with the column, and the
     * client agreed to that.
     */
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            $table->dropColumn('summary');
        });
    }

    /** Restores the column's shape only. The text it held cannot come back. */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            $table->string('summary', 300)->nullable()->after('name');
        });
    }
};
