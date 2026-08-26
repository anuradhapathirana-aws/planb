<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\AttemptStatus;
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

    public function submit(Student $student, CoursePaperAttempt $attempt): bool
    {
        return $attempt->student_id === $student->id
            && $attempt->status === AttemptStatus::InProgress;
    }
}
