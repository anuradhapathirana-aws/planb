<?php

declare(strict_types=1);

namespace App\Services\Service;

use App\Enums\ServicePurchaseStatus;
use App\Models\Order;
use App\Models\Service;
use App\Models\ServicePurchase;
use App\Models\Student;
use App\Models\User;
use App\Services\Payment\OrderService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Everything that happens after a service is paid for.
 *
 * The service-side counterpart of `EnrolmentService`, and the single place a
 * `ServicePurchase` is created or moved along — so "how does a delivery job come
 * into being, and who closed it" has exactly one answer.
 */
class ServicePurchaseService
{
    public function __construct(private readonly OrderService $orders) {}

    /**
     * Statuses that count as still being worked on.
     *
     * @return list<string>
     */
    public static function openStatuses(): array
    {
        return array_values(array_map(
            fn (ServicePurchaseStatus $status) => $status->value,
            array_filter(ServicePurchaseStatus::cases(), fn (ServicePurchaseStatus $status) => $status->isOpen()),
        ));
    }

    /**
     * Turns a settled order into a delivery job.
     *
     * Idempotent by construction: `service_purchases.order_id` is unique and
     * `firstOrCreate` turns a replayed webhook — or an admin approving a bank
     * transfer for an order a card already settled — into a no-op rather than a
     * second job for the delivery team.
     */
    public function fulfil(Student $student, Service $service, Order $order): ServicePurchase
    {
        return DB::transaction(fn (): ServicePurchase => ServicePurchase::firstOrCreate(
            ['order_id' => $order->id],
            [
                'student_id' => $student->id,
                'service_id' => $service->id,
                // The order's own snapshot, so the queue and the receipt agree
                // even after the service has been renamed.
                'title_snapshot' => $order->title_snapshot,
                'purchased_at' => $order->paid_at ?? now(),
            ],
        ));
    }

    /**
     * Opens the order a student pays a service with.
     *
     * There is no free branch here, unlike a course: a service always costs
     * money, so this always ends in an order. What it must never do is create a
     * *second* one while delivery of the last is still running — that is how a
     * double tap becomes a double charge for work nobody has started.
     *
     * The amount is not a parameter and never will be: `OrderService` reads it
     * off the service, on the server (root CLAUDE.md §7.3).
     *
     * @throws ValidationException
     */
    public function purchase(Student $student, Service $service): Order
    {
        $open = $this->openPurchaseFor($student, $service);

        if ($open !== null) {
            throw ValidationException::withMessages([
                'service' => 'You have already bought this service and we are still working on it.',
            ]);
        }

        return $this->orders->createFor($student, $service);
    }

    /**
     * The purchase blocking a repeat buy, if there is one.
     *
     * A student may buy the same service again once the last one is finished — a
     * second visa consultation is a real thing — but not while one is still
     * open, which is what stops a double tap becoming a double charge.
     */
    public function openPurchaseFor(Student $student, Service $service): ?ServicePurchase
    {
        return ServicePurchase::where('student_id', $student->id)
            ->where('service_id', $service->id)
            ->whereIn('status', self::openStatuses())
            ->latest('id')
            ->first();
    }

    /**
     * Advances one purchase, recording who did it and when.
     *
     * The transition table lives on the enum: a completed job cannot be quietly
     * reopened and nothing can jump backwards, so the timestamps below stay a
     * truthful history rather than whatever was written last.
     *
     * @throws ValidationException
     */
    public function advance(
        ServicePurchase $purchase,
        ServicePurchaseStatus $to,
        User $admin,
        ?string $note = null,
    ): ServicePurchase {
        $from = $purchase->status;

        if ($from === $to) {
            throw ValidationException::withMessages([
                'status' => 'This request is already '.$this->label($to).'.',
            ]);
        }

        if (! in_array($to, $from->allowedTransitions(), true)) {
            throw ValidationException::withMessages([
                'status' => $from->isFinal()
                    ? 'This request is already closed and cannot be changed.'
                    : 'A request that is '.$this->label($from).' cannot be moved to '.$this->label($to).'.',
            ]);
        }

        DB::transaction(function () use ($purchase, $to, $admin, $note): void {
            $purchase->forceFill([
                'status' => $to,
                'handled_by' => $admin->id,
                'admin_note' => $note ?? $purchase->admin_note,
                'started_at' => $to === ServicePurchaseStatus::InProgress ? now() : $purchase->started_at,
                'completed_at' => $to === ServicePurchaseStatus::Completed ? now() : $purchase->completed_at,
                'cancelled_at' => $to === ServicePurchaseStatus::Cancelled ? now() : $purchase->cancelled_at,
            ])->save();
        });

        return $this->loadDetail($purchase->refresh());
    }

    /**
     * The admin delivery queue.
     *
     * @param  array{search?: string, status?: string, service_id?: int, student_id?: int, sort?: string, direction?: string, per_page?: int}  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = ServicePurchase::query()
            ->with([
                'student:id,student_id,full_name,email',
                'service:id,name',
                'order:id,order_number,amount_cents,currency,status,paid_at',
                'handler:id,name',
            ])
            ->when(
                filled($filters['search'] ?? null),
                fn (Builder $q) => $q->where(function (Builder $inner) use ($filters): void {
                    // Escaped: `%` and `_` are LIKE wildcards, not search terms.
                    $term = '%'.addcslashes($filters['search'], '%_\\').'%';
                    $inner->where('title_snapshot', 'like', $term)
                        ->orWhereHas('order', fn (Builder $order) => $order->where('order_number', 'like', $term))
                        ->orWhereHas(
                            'student',
                            fn (Builder $student) => $student->where('full_name', 'like', $term)
                                ->orWhere('student_id', 'like', $term),
                        );
                }),
            )
            ->when(
                in_array($filters['status'] ?? null, ServicePurchaseStatus::values(), true),
                fn (Builder $q) => $q->where('status', $filters['status']),
            )
            ->when(
                filled($filters['service_id'] ?? null),
                fn (Builder $q) => $q->where('service_id', $filters['service_id']),
            )
            ->when(
                filled($filters['student_id'] ?? null),
                fn (Builder $q) => $q->where('student_id', $filters['student_id']),
            );

        $sortable = ['purchased_at', 'created_at', 'status'];
        $sort = in_array($filters['sort'] ?? null, $sortable, true) ? $filters['sort'] : 'purchased_at';
        $direction = ($filters['direction'] ?? null) === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sort, $direction)
            ->orderByDesc('id')
            ->paginate($this->perPage($filters['per_page'] ?? null))
            ->withQueryString();
    }

    /**
     * What a student sees under "My services". Newest first.
     *
     * The service is loaded `withTrashed()`: one the admin has since withdrawn
     * still has to appear here, because the student paid for it and the work is
     * still owed. `title_snapshot` covers the wording either way; the Resource
     * reports whether the catalogue entry can still be opened.
     */
    public function listForStudent(Student $student, mixed $perPage = null): LengthAwarePaginator
    {
        return ServicePurchase::where('student_id', $student->id)
            ->with([
                'service' => fn ($service) => $service->withTrashed()->select(['id', 'name', 'status', 'deleted_at']),
                'service.media',
                'order:id,order_number,amount_cents,currency,status,paid_at',
            ])
            ->orderByDesc('id')
            ->paginate($this->perPage($perPage));
    }

    public function loadDetail(ServicePurchase $purchase): ServicePurchase
    {
        return $purchase->load([
            'student:id,student_id,full_name,email',
            'service:id,name',
            'order.payments',
            'handler:id,name',
        ]);
    }

    /** Bounded so `per_page=100000` cannot be used to pull the whole table. */
    private function perPage(mixed $requested): int
    {
        return min(max((int) ($requested ?: 15), 1), 100);
    }

    private function label(ServicePurchaseStatus $status): string
    {
        return match ($status) {
            ServicePurchaseStatus::Pending => 'waiting to start',
            ServicePurchaseStatus::InProgress => 'in progress',
            ServicePurchaseStatus::Completed => 'completed',
            ServicePurchaseStatus::Cancelled => 'cancelled',
        };
    }
}
