<?php

declare(strict_types=1);

namespace App\Services\Payment;

use App\Contracts\Purchasable;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\CourseProgramme;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Student;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(private readonly PaymentAvailability $availability) {}

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
        $this->availability->assertEnabled();

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

    /**
     * Opens an order for a course bundle, with the exact courses and prices it
     * covers frozen into `order_items`. Settlement enrols those rows and nothing
     * else, so what the student receives cannot drift from what they paid for.
     *
     * The caller works out WHICH courses (those the student does not own yet);
     * this only prices and records them — from the courses, never from the
     * request.
     *
     * An unsettled order for the same bundle is reused while it still covers the
     * same courses at the same prices. If the student's bundle has changed since
     * (they bought a course, an admin added one or changed a price) and no
     * payment was started against it, it is cancelled and a fresh one opened —
     * otherwise they would pay for a course they already own. Once a payment was
     * started (a card checkout, a bank slip under review) it is left alone: its
     * frozen items and amount still match each other.
     *
     * @param  Collection<int, CourseProgramme>  $courses
     */
    public function createForItems(Student $student, Purchasable&Model $purchasable, Collection $courses): Order
    {
        $this->availability->assertEnabled();

        $amount = (int) $courses->sum(fn (CourseProgramme $course) => $course->purchasablePriceCents());

        if ($courses->isEmpty() || $amount <= 0) {
            throw ValidationException::withMessages([
                'purchasable' => 'There is nothing in this bundle left to pay for.',
            ]);
        }

        return DB::transaction(function () use ($student, $purchasable, $courses, $amount): Order {
            $existing = Order::where('student_id', $student->id)
                ->where('purchasable_type', $purchasable->getMorphClass())
                ->where('purchasable_id', $purchasable->getKey())
                ->whereIn('status', [OrderStatus::Pending, OrderStatus::AwaitingVerification])
                ->with('items')
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                $sameContents = $existing->items
                    ->mapWithKeys(fn (OrderItem $item) => [$item->course_programme_id => $item->price_cents])
                    ->sortKeys()
                    ->all() === $courses
                    ->mapWithKeys(fn (CourseProgramme $course) => [$course->id => $course->purchasablePriceCents()])
                    ->sortKeys()
                    ->all();

                // A payment under way (a card checkout open, a slip under review)
                // pins the order: its items and amount still match each other.
                $paymentUnderWay = $existing->status === OrderStatus::AwaitingVerification
                    || $existing->payments()
                        ->whereIn('status', [PaymentStatus::Pending, PaymentStatus::Processing])
                        ->exists();

                if ($sameContents || $paymentUnderWay) {
                    return $existing;
                }

                $existing->update(['status' => OrderStatus::Cancelled, 'cancelled_at' => now()]);
            }

            $order = Order::create([
                'order_number' => $this->nextOrderNumber(),
                'student_id' => $student->id,
                'purchasable_type' => $purchasable->getMorphClass(),
                'purchasable_id' => $purchasable->getKey(),
                'title_snapshot' => $purchasable->purchasableTitle(),
                'amount_cents' => $amount,
                'currency' => $purchasable->purchasableCurrency(),
                'status' => OrderStatus::Pending,
            ]);

            foreach ($courses as $course) {
                $order->items()->create([
                    'course_programme_id' => $course->id,
                    'price_cents' => $course->purchasablePriceCents(),
                    // English, like every order title — it is a record.
                    'title_snapshot' => $course->purchasableTitle(),
                ]);
            }

            return $order->load('items');
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
            // `payments.media` so each row's `has_receipt` is not a query of its own.
            ->with(['student:id,student_id,full_name,email', 'payments.media', 'purchasable'])
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
