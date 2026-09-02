<?php

declare(strict_types=1);

namespace App\Services\Service;

use App\Models\Service;
use App\Models\ServicePurchase;
use App\Models\Student;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * The published catalogue, as one student sees it.
 *
 * Separate from `ServiceCatalogService` for the same reason
 * `StudentCourseService` is separate from `CourseProgrammeService`: the admin
 * reads drafts and counts, a student reads neither, and one query builder
 * serving both is how a draft eventually leaks.
 */
class StudentServiceCatalogService
{
    /**
     * Published services, newest-priority first, each annotated with whether
     * this student already has one in flight.
     *
     * @param  array{search?: string, per_page?: int}  $filters
     */
    public function list(Student $student, array $filters = []): LengthAwarePaginator
    {
        return $this->baseQuery($student)
            ->when(
                filled($filters['search'] ?? null),
                fn (Builder $query) => $query->where(function (Builder $inner) use ($filters): void {
                    // Escaped, and wrapped in its own closure so the OR below
                    // cannot escape the `published()` filter around it.
                    $term = '%'.addcslashes($filters['search'], '%_\\').'%';
                    $inner->where('name', 'like', $term)->orWhere('summary', 'like', $term);
                }),
            )
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(min(max((int) ($filters['per_page'] ?? 20), 1), 50))
            ->withQueryString();
    }

    /**
     * One published service, or a 404.
     *
     * Resolved here rather than through `Route::bind`, deliberately.
     * `Route::bind` registers a binder on the router GLOBALLY, so a
     * published-only binder named `service` would also rewrite the admin panel's
     * `/admin/services/{service}` route and hide every draft from the people
     * whose job is to write them — the same trap `routes/api_student.php`
     * documents for `course`, and the reason `PaymentController` checks order
     * ownership by hand.
     *
     * This scope *is* the authorization; no policy is involved
     * (backend/CLAUDE.md §2).
     */
    public function findPublishedOrFail(Student $student, string|int $id): Service
    {
        return $this->baseQuery($student)->findOrFail($id);
    }

    /** @return Builder<Service> */
    private function baseQuery(Student $student): Builder
    {
        return Service::query()
            ->published()
            ->with('media')
            ->addSelect([
                /*
                 * Presentation only — it lets the app show "In progress" rather
                 * than a Buy button that would 422. The refusal itself lives in
                 * `ServicePurchaseService::purchase()`.
                 */
                'open_purchase_status' => ServicePurchase::query()
                    ->select('status')
                    ->whereColumn('service_id', 'services.id')
                    ->where('student_id', $student->id)
                    ->whereIn('status', ServicePurchaseService::openStatuses())
                    ->latest('id')
                    ->limit(1),
            ]);
    }
}
