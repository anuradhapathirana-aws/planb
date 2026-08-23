<?php

declare(strict_types=1);

namespace App\Http\Requests\Industry;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIndustryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('industry'));
    }

    public function rules(): array
    {
        $industryId = $this->route('industry')->id;

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('industries', 'name')->ignore($industryId)],
        ];
    }
}
