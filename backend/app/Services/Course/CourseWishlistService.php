<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Models\CourseProgramme;
use App\Models\CourseWishlist;
use App\Models\Student;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * A student's saved courses: add, remove, and which ones are saved.
 *
 * Every method takes the authenticated `Student`, never a student id from the
 * request (root CLAUDE.md §4.9), so one student can neither read nor change
 * another's list. The course itself arrives through the published-only route
 * binding, which is the authorization for WHICH courses may be saved.
 *
 * Listing the saved courses as full course rows lives in
 * {@see StudentCourseService::wishlist()}, next to the course list it mirrors.
 */
class CourseWishlistService
{
    /**
     * Save a course. Idempotent — saving one already on the list is a no-op, so
     * a retried request on a flaky connection lands on the same answer.
     */
    public function add(Student $student, CourseProgramme $programme): void
    {
        try {
            CourseWishlist::firstOrCreate([
                'student_id' => $student->id,
                'course_programme_id' => $programme->id,
            ]);
        } catch (UniqueConstraintViolationException) {
            /*
             * Two taps landed at once and both read "no row" before either
             * wrote. The unique index caught the loser, and the row the student
             * asked for exists — which is the outcome they wanted, not a 500.
             */
        }
    }

    /** Unsave a course. Idempotent — removing one that is not saved does nothing. */
    public function remove(Student $student, CourseProgramme $programme): void
    {
        CourseWishlist::query()
            ->where('student_id', $student->id)
            ->where('course_programme_id', $programme->id)
            ->delete();
    }

    /**
     * Ids of every course on this student's list, newest save first. One query,
     * so a course list page can mark all its rows without an N+1.
     *
     * @return list<int>
     */
    public function programmeIds(Student $student): array
    {
        return CourseWishlist::query()
            ->where('student_id', $student->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->pluck('course_programme_id')
            ->map(fn ($id): int => (int) $id)
            ->values()
            ->all();
    }
}
