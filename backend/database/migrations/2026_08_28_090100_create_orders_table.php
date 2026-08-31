<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();

            /*
             * Polymorphic on purpose: a course programme today, a premium service
             * tomorrow. Both implement App\Contracts\Purchasable, so the order,
             * payment and webhook code never learns what it is selling.
             */
            $table->morphs('purchasable');

            // Frozen at purchase time. An admin renaming or repricing a course
            // afterwards must not rewrite what a student was actually charged for.
            $table->string('title_snapshot');
            $table->unsignedBigInteger('amount_cents');
            $table->char('currency', 3);

            $table->string('status')->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
