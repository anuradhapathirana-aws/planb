<?php

declare(strict_types=1);

namespace App\Services\Student;

use App\Models\Student;
use Illuminate\Support\Collection;

/**
 * A few other learners, for the "N learners" stack on Course Details — shown as
 * initials only.
 *
 * It used to return their photos. A face identifies a person even with the name
 * stripped, and this is the one endpoint where a student reads data about other
 * students, so the client decided (launch guide §1) that the stack shows
 * initials and nothing more. Initials of a few recent sign-ups, not scoped to any
 * course, say nothing about who is taking what.
 *
 * Deliberately NOT scoped to a course. Two reasons:
 *
 *  1. Privacy. Listing the students enrolled in a *specific* course tells the
 *     viewer who is taking it; the narrower query is the leakier one.
 *  2. It would be empty. Plan B is starting with a small roll, and a stack that
 *     renders nothing on most courses is worse than no stack.
 *
 * Blocked and unregistered students are excluded, and `SoftDeletes` on the model
 * excludes deleted and self-deleted (anonymised) ones.
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
            // No name, no initials — an empty circle reads as a broken image.
            ->whereNotNull('full_name')
            ->where('full_name', '!=', '')
            ->latest('registered_at')
            ->limit(self::LIMIT)
            ->get(['id', 'full_name', 'registered_at']);
    }

    /** "Nimal Perera" → "NP"; one word → one letter. Never more than two. */
    public static function initials(string $fullName): string
    {
        $parts = preg_split('/\s+/u', trim($fullName), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return mb_strtoupper(implode('', array_map(
            fn (string $part): string => mb_substr($part, 0, 1),
            array_slice($parts, 0, 2),
        )));
    }
}
