<?php

declare(strict_types=1);

namespace App\Services\Payment;

use App\Contracts\Purchasable;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Student;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    /**
     * Opens an order for anything purchasable.
     *
     * The price is read from the product **here, on the server** — never from the
     * request. A client-supplied amount is the oldest way to buy a course for one
     * rupee (root CLAUDE.md §7.3).
     *
     * Reuses an existing unsettled order for the same product rather than opening
     * a second one, so a student who backs out of checkout and returns does not
     * accumulate abandoned orders.
     */
    public function createFor(Student $student, Purchasable&Model $purchasable): Order
    {
        if (! $purchasable->isPurchasable()) {
            throw ValidationException::withMessages([
                'purchasable' => 'This item is not available for purchase right now.',
            ]);
        }

        if ($purchasable->purchasablePriceCents() <= 0) {
            throw ValidationException::withMessages([
                'purchasable' => 'This item is free and does not need an order.',
            ]);
        }

        return DB::transaction(function () use ($student, $purchasable): Order {
            $existing = Order::where('student_id', $student->id)
                ->where('purchasable_type', $purchasable->getMorphClass())
                ->where('purchasable_id', $purchasable->getKey())
                ->whereIn('status', [OrderStatus::Pending, OrderStatus::AwaitingVerification])
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            return Order::create([
                'order_number' => $this->nextOrderNumber(),
                'student_id' => $student->id,
                'purchasable_type' => $purchasable->getMorphClass(),
                'purchasable_id' => $purchasable->getKey(),
                'title_snapshot' => $purchasable->purchasableTitle(),
                'amount_cents' => $purchasable->purchasablePriceCents(),
                'currency' => $purchasable->purchasableCurrency(),
                'status' => OrderStatus::Pending,
            ]);
        });
    }

    public function cancel(Order $order): Order
    {
        if ($order->isSettled()) {
            throw ValidationException::withMessages([
                'order' => 'This order has already been completed and cannot be cancelled.',
            ]);
        }

        $order->update([
            'status' => OrderStatus::Cancelled,
            'cancelled_at' => now(),
        ]);

        return $order->refresh();
    }

    /**
     * @param  array{search?: string, status?: string, method?: string, student_id?: int, sort?: string, direction?: string, per_page?: int}  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = Order::query()
            ->with(['student:id,student_id,full_name,email', 'payments', 'purchasable'])
            ->when(
                filled($filters['search'] ?? null),
                fn ($q) => $q->where(function ($inner) use ($filters): void {
                    $term = '%'.$filters['search'].'%';
                    $inner->where('order_number', 'like', $term)
                        ->orWhere('title_snapshot', 'like', $term)
                        ->orWhereHas(
                            'student',
                            fn ($s) => $s->where('full_name', 'like', $term)
                                ->orWhere('student_id', 'like', $term),
                        );
                }),
            )
            ->when(
                in_array($filters['status'] ?? null, OrderStatus::values(), true),
                fn ($q) => $q->where('status', $filters['status']),
            )
            ->when(
                filled($filters['student_id'] ?? null),
                fn ($q) => $q->where('student_id', $filters['student_id']),
            )
            ->when(
                filled($filters['method'] ?? null),
                fn ($q) => $q->whereHas('payments', fn ($p) => $p->where('method', $filters['method'])),
            );

        $sortable = ['created_at', 'amount_cents', 'order_number'];
        $sort = in_array($filters['sort'] ?? null, $sortable, true) ? $filters['sort'] : 'created_at';
        $direction = ($filters['direction'] ?? null) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sort, $direction)
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();
    }

    /**
     * Sequential, human-quotable reference. Locked so two concurrent checkouts
     * cannot land on the same number, mirroring how student IDs are issued.
     */
    private function nextOrderNumber(): string
    {
        $last = Order::query()
            ->lockForUpdate()
            ->orderByDesc('id')
            ->value('order_number');

        $next = $last !== null && preg_match('/(\d+)$/', $last, $m) === 1
            ? ((int) $m[1]) + 1
            : 1;

        return 'PB-ORD-'.str_pad((string) $next, 6, '0', STR_PAD_LEFT);
    }
}
