<?php

declare(strict_types=1);

namespace App\Services\Student;

use App\Models\Student;
use Illuminate\Support\Facades\DB;

/**
 * Allocates the sequential Plan B student ID (PB-10001, PB-10002, ...).
 *
 * Extracted from StudentManagementService because self-registration now needs
 * the same number from a completely different entry point — a student signing
 * in with Google, on the student guard. Duplicating the sequence logic in the
 * auth service would give two code paths a chance to disagree about what "next"
 * means, which is exactly how two students end up sharing an ID.
 */
class StudentIdGenerator
{
    /**
     * The next free ID, reserved for the caller's transaction.
     *
     * Locks the matching rows for the duration, so two concurrent creates — an
     * admin submitting "Add student" while a student signs up with Google —
     * can't be handed the same number. Call this INSIDE the transaction that
     * inserts the row, or the lock is released before the insert lands.
     */
    public function next(): string
    {
        return DB::transaction(fn (): string => $this->format($this->nextNumber(lock: true)));
    }

    /**
     * Read-only preview of the ID the next "Add student" submission would get,
     * so the admin can see it before saving. Not reserved — a concurrent create
     * (or CSV import landing on the same number) can still take it first, in
     * which case the create form simply shows a different, still-unused ID.
     */
    public function preview(): string
    {
        return $this->format($this->nextNumber(lock: false));
    }

    private function nextNumber(bool $lock): int
    {
        // withTrashed: a soft-deleted student still owns its ID, and the unique
        // index still covers it.
        $query = Student::withTrashed()->where('student_id', 'like', 'PB-%');

        if ($lock) {
            $query->lockForUpdate();
        }

        $last = $query->orderByRaw('CAST(SUBSTRING(student_id, 4) AS UNSIGNED) DESC')->value('student_id');

        return $last ? ((int) substr($last, 3)) + 1 : 10001;
    }

    private function format(int $number): string
    {
        return "PB-{$number}";
    }
}
