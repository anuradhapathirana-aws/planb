<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\CoursePaperAttempt;
use App\Models\Student;

/**
 * The first policy in this codebase whose actor is a `Student` rather than a
 * `User`.
 *
 * That is only safe because it guards a NEW model: widening one of the existing
 * `User`-typed policies to accept a student would turn a guard leak from a 401
 * into a silent authorization bypass (backend/CLAUDE.md §2). The
 * `student.actor` middleware guarantees the actor here is always a `Student`.
 */
class CoursePaperAttemptPolicy
{
    public function view(Student $student, CoursePaperAttempt $attempt): bool
    {
        return $attempt->student_id === $student->id;
    }

    /**
     * Ownership only — deliberately NOT whether the attempt is still open.
     *
     * A policy answers "may this person touch this record", and the answer for
     * their own attempt is always yes. Whether it can still be *submitted* is
     * state, and belongs to CoursePaperAttemptService::submit(), which throws a
     * 422 saying "This attempt has already been submitted."
     *
     * Conflating the two produced a bare 403 "This action is unauthorized" when
     * a student re-submitted a finished attempt — technically true, and useless
     * to the person reading it.
     */
    public function submit(Student $student, CoursePaperAttempt $attempt): bool
    {
        return $attempt->student_id === $student->id;
    }
}
