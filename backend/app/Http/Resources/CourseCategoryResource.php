<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CourseCategory;
use App\Support\PublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CourseCategory */
class CourseCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            // Raw, never the English fallback — the admin form edits this column.
            'name_si' => $this->name_si,
            'description' => $this->description,
            'icon' => $this->icon?->value,
            // A sub-category's uploaded icon. When set it wins over `icon`.
            'icon_image_url' => PublicUrl::forRequest($this->icon_image_url, $request),
            // `single` or `bundle`; a sub-category may also be `inherit` (follow
            // its main category).
            'selling_mode' => $this->selling_mode->value,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            // Courses placed directly on this category.
            'programmes_count' => $this->whenCounted('programmes'),
            'children' => self::collection($this->whenLoaded('children')),
            // Just enough to label a course "Migration › UAE" in the admin list.
            'parent' => $this->whenLoaded('parent', fn () => $this->parent === null ? null : [
                'id' => $this->parent->id,
                'name' => $this->parent->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
