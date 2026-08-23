<?php

declare(strict_types=1);

namespace App\Http\Requests\Profession;

use App\Models\Profession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProfessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Profession::class);
    }

    public function rules(): array
    {
        return [
            'industry_id' => ['required', 'integer', 'exists:industries,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('professions', 'name')->where('industry_id', $this->input('industry_id')),
            ],
        ];
    }
}
