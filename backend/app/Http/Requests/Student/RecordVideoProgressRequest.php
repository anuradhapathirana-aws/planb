<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class RecordVideoProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * These bounds only keep nonsense out of the service; they are not the
     * no-skip rule. That is enforced in `CourseProgressService`, which treats
     * both numbers as claims and clamps them against the wall clock.
     *
     * The 24h ceiling is a sanity bound, not a policy — no lesson is that long.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'position_seconds' => ['required', 'integer', 'min:0', 'max:86400'],
            // Seconds actually played since the last flush — not a timestamp difference.
            'watched_delta_seconds' => ['required', 'integer', 'min:0', 'max:86400'],
        ];
    }
}
