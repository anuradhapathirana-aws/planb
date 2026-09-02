<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_purchases', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();

            /*
             * Created only by a settled order — there is no free service and no
             * admin grant, so this is never null. It is also the idempotency
             * key: see the unique index below.
             */
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            // Frozen at purchase time, like `orders.title_snapshot`. Renaming a
            // service later must not rewrite what somebody bought.
            $table->string('title_snapshot');

            $table->string('status')->default('pending');

            // Who last moved it along, for the same audit reason payments record
            // their reviewer.
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();

            // Internal. Never leaves the admin API — see StudentServicePurchaseResource.
            $table->string('admin_note', 1000)->nullable();

            $table->timestamp('purchased_at');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            /*
             * Load-bearing, exactly like `enrolments.unique(student, course)`:
             * gateways replay callbacks, so the same order settles more than
             * once. One purchase per order makes a replay incapable of creating
             * a second job for the delivery team.
             */
            $table->unique('order_id');

            $table->index(['student_id', 'status']);
            $table->index(['service_id', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_purchases');
    }
};
