<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The service detail screen: the summary row plus the long description.
 *
 * @mixin Service
 */
class StudentServiceDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return (new StudentServiceSummaryResource($this->resource))->toArray($request) + [
            // Sanitized when the admin saved it. Still rendered through
            // DOMPurify on the client (root CLAUDE.md §7.6).
            'description' => $this->description,
        ];
    }
}
