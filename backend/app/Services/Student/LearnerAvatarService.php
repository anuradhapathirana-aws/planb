<?php

declare(strict_types=1);

namespace App\Services\Student;

use App\Models\Student;
use Illuminate\Support\Collection;

/**
 * A handful of real learner photos, for the "N learners" stack on Course Details.
 *
 * Deliberately NOT scoped to a course. Two reasons:
 *
 *  1. Privacy. Returning the faces of the students enrolled in a *specific*
 *     course tells the viewer who is taking it. A photo carries identity even
 *     with the name stripped, so the narrower query is the leakier one.
 *  2. It would be empty. Plan B is starting with a small roll, and a stack that
 *     renders nothing on most courses is worse than no stack.
 *
 * Only the photo URL leaves the server — no name, no id, nothing that can be
 * joined back to a record. Blocked and unregistered students are excluded, and
 * `SoftDeletes` on the model excludes deleted ones.
 */
class LearnerAvatarService
{
    /** More than a stack can show without the overlap becoming a smear. */
    private const LIMIT = 4;

    /** @return Collection<int, Student> */
    public function recent(Student $viewer): Collection
    {
        return Student::query()
            ->whereNotNull('registered_at')
            ->where('is_blocked', false)
            ->whereKeyNot($viewer->getKey())
            // The stack has no fallback: a student with no photo would render as
            // an empty circle, which reads as a broken image rather than a person.
            ->whereHas('media', fn ($query) => $query->where('collection_name', 'profile_photo'))
            ->with('media')
            ->latest('registered_at')
            ->limit(self::LIMIT)
            ->get();
    }
}
