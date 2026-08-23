<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Profession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Profession */
class ProfessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'industry_id' => $this->industry_id,
            'name' => $this->name,
            'is_active' => $this->is_active,
            'industry' => $this->industry ? new IndustryResource($this->industry) : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
