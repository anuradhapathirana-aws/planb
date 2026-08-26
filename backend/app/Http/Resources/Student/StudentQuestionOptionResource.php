<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\CourseQuestionOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An answer option, as a student sees it.
 *
 * **`is_correct` is deliberately absent, and must stay absent.** The admin
 * `CourseQuestionOptionResource` includes it because only admins read that
 * endpoint; this is the reason a student-facing endpoint gets its own Resource
 * rather than reusing one (CLAUDE.md "Answer Keys & Student-Facing Payloads").
 *
 * A client that simply does not *render* the field still ships the entire answer
 * key in the network tab, where anyone can read it. `StudentPaperTest` asserts
 * the key never appears in a response.
 *
 * @mixin CourseQuestionOption
 */
class StudentQuestionOptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'text' => $this->text,
        ];
    }
}
