<?php

declare(strict_types=1);

namespace App\Http\Requests\Profession;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('profession'));
    }

    public function rules(): array
    {
        $professionId = $this->route('profession')->id;

        return [
            'industry_id' => ['required', 'integer', 'exists:industries,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('professions', 'name')
                    ->where('industry_id', $this->input('industry_id'))
                    ->ignore($professionId),
            ],
        ];
    }
}
