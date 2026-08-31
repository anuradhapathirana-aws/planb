<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\EnrolmentSource;
use App\Models\CourseProgramme;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Grants and reports course access.
 *
 * The single place an enrolment is created. Everything that can hand out access
 * — a settled payment, a free course, an admin grant — comes through here, so
 * "how does a student get access" has exactly one answer.
 */
class EnrolmentService
{
    /**
     * Idempotent by construction: the unique (student_id, course_programme_id)
     * index means a duplicated webhook or a double-tapped button cannot enrol
     * twice, and `firstOrCreate` turns the race into a no-op rather than an error.
     */
    public function grant(
        Student $student,
        CourseProgramme $programme,
        EnrolmentSource $source,
        ?Order $order = null,
        ?User $grantedBy = null,
    ): Enrolment {
        return DB::transaction(fn (): Enrolment => Enrolment::firstOrCreate(
            [
                'student_id' => $student->id,
                'course_programme_id' => $programme->id,
            ],
            [
                'order_id' => $order?->id,
                'source' => $source,
                'granted_by' => $grantedBy?->id,
                'enrolled_at' => now(),
            ],
        ));
    }

    /**
     * Revoking is deliberately narrow: it is for correcting a mistaken grant, not
     * for refunds. A refund has to reverse money as well, which is a separate
     * flow with its own audit trail.
     */
    public function revoke(Student $student, CourseProgramme $programme): void
    {
        Enrolment::where('student_id', $student->id)
            ->where('course_programme_id', $programme->id)
            ->delete();
    }

    public function isEnrolled(Student $student, CourseProgramme $programme): bool
    {
        return Enrolment::where('student_id', $student->id)
            ->where('course_programme_id', $programme->id)
            ->exists();
    }

    /**
     * Course ids this student may open, for gating a list in one query instead of
     * one per row.
     *
     * @return list<int>
     */
    public function enrolledProgrammeIds(Student $student): array
    {
        return Enrolment::where('student_id', $student->id)
            ->pluck('course_programme_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * A free course needs no order, so access is granted the moment the student
     * asks for it. Returns null when the course is not free, leaving the caller
     * to start a paid order instead.
     */
    public function grantIfFree(Student $student, CourseProgramme $programme): ?Enrolment
    {
        if (! $programme->isFree() || ! $programme->isPurchasable()) {
            return null;
        }

        return $this->grant($student, $programme, EnrolmentSource::Free);
    }
}
