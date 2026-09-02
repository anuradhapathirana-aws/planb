<?php

declare(strict_types=1);

namespace App\Http\Requests\Service;

use App\Models\Service;
use Illuminate\Validation\Rule;

class StoreServiceRequest extends ServiceRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Service::class);
    }

    /**
     * Uniqueness is enforced here rather than by a database index, because
     * services are soft-deleted: a unique column would turn "delete a service,
     * later create one with the same name" into a 500 instead of this message.
     */
    protected function nameRules(): array
    {
        return [
            'required',
            'string',
            'max:255',
            Rule::unique('services', 'name')->whereNull('deleted_at'),
        ];
    }
}
