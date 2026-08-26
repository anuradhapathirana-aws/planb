<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An industry or profession as an option in the student's profile form.
 *
 * Its own Resource rather than the admin `IndustryResource` (root CLAUDE.md
 * §16.5). The admin version carries `is_active`, `professions_count` and
 * timestamps — internal bookkeeping the student has no use for, and which would
 * grow every time the admin list gains a column.
 *
 * `industry_id` is present on professions so the app can filter the profession
 * list client-side after the student picks an industry.
 */
class StudentReferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return array_filter([
            'id' => $this->id,
            'name' => $this->name,
            'industry_id' => $this->industry_id ?? null,
        ], static fn ($value) => $value !== null);
    }
}
