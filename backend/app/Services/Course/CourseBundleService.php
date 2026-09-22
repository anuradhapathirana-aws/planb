<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\CourseStatus;
use App\Enums\EnrolmentSource;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\Order;
use App\Models\Student;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Payment\OrderService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Course bundles: a category in `bundle` selling mode sells its courses together,
 * never one by one. A main category's bundle also holds the courses of every
 * sub-category that follows it; a sub-category can be a bundle of its own
 * ({@see CourseCategory::bundleOwner()}). Each course is in at most one bundle.
 *
 * **A student pays only for what they do not own.** Courses they already have —
 * bought earlier, free, or granted — are left out of the bundle and its price.
 * So a course added to the category after a purchase is simply "the 1 course
 * left", bought the same way.
 *
 * The one place that decides what a student's bundle contains. The price is
 * summed from the courses on the server and frozen into the order's items;
 * settlement enrols those rows, as ordinary enrolments marked `bundle`, so an
 * admin sees each course a student received through one.
 */
class CourseBundleService
{
    public function __construct(
        private readonly EnrolmentService $enrolments,
        private readonly OrderService $orders,
    ) {}

    /**
     * What this student's bundle is right now. `$bundle` is the bundle owner —
     * see {@see CourseCategory::bundleOwner()}.
     *
     * @return array{courses: Collection<int, CourseProgramme>, remaining: Collection<int, CourseProgramme>, owned_count: int, remaining_price_cents: int, currency: string}
     */
    public function quote(Student $student, CourseCategory $bundle): array
    {
        $courses = CourseProgramme::query()
            ->whereIn('course_category_id', $bundle->bundleCategoryIds())
            ->where('status', CourseStatus::Published)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $ownedIds = $this->enrolments->enrolledProgrammeIds($student);
        $remaining = $courses->reject(fn (CourseProgramme $course) => in_array($course->id, $ownedIds, true))->values();

        return [
            'courses' => $courses,
            'remaining' => $remaining,
            'owned_count' => $courses->count() - $remaining->count(),
            'remaining_price_cents' => (int) $remaining->sum(fn (CourseProgramme $course) => $course->purchasablePriceCents()),
            'currency' => $bundle->purchasableCurrency(),
        ];
    }

    /**
     * Buy the rest of the bundle.
     *
     * Returns the order to pay against, or null when there is nothing to pay:
     * the student already owns every course, or only free ones were left — those
     * are enrolled on the spot, like opening a free course.
     */
    public function purchase(Student $student, CourseCategory $bundle): ?Order
    {
        if (! $bundle->isPurchasable()) {
            throw ValidationException::withMessages([
                'category' => 'This course bundle is not available right now.',
            ]);
        }

        $quote = $this->quote($student, $bundle);

        if ($quote['remaining']->isEmpty()) {
            return null;
        }

        if ($quote['remaining_price_cents'] === 0) {
            DB::transaction(function () use ($student, $quote): void {
                foreach ($quote['remaining'] as $course) {
                    $this->enrolments->grant($student, $course, EnrolmentSource::Free);
                }
            });

            return null;
        }

        return $this->orders->createForItems($student, $bundle, $quote['remaining']);
    }

    /**
     * Settles a paid bundle order: one enrolment per frozen item. Idempotent —
     * `grant()` is, and this runs again on every replayed webhook. A course
     * withdrawn since the order was opened is still granted: it was paid for.
     */
    public function fulfil(Student $student, Order $order): void
    {
        foreach ($order->items()->with('programme')->get() as $item) {
            if ($item->programme !== null) {
                $this->enrolments->grant($student, $item->programme, EnrolmentSource::Bundle, $order);
            }
        }
    }
}
