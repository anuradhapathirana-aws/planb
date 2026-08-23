<?php

declare(strict_types=1);

namespace App\Http\Requests\Industry;

use App\Models\Industry;
use Illuminate\Foundation\Http\FormRequest;

class StoreIndustryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Industry::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:industries,name'],
        ];
    }
}
