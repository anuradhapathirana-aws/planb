<?php

declare(strict_types=1);

namespace App\Http\Requests\Service;

use App\Models\Service;
use Illuminate\Validation\Rule;

class UpdateServiceRequest extends ServiceRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->service());
    }

    /** @see StoreServiceRequest::nameRules() for why this is not a DB constraint. */
    protected function nameRules(): array
    {
        return [
            'required',
            'string',
            'max:255',
            Rule::unique('services', 'name')
                ->whereNull('deleted_at')
                ->ignore($this->service()),
        ];
    }

    private function service(): Service
    {
        /** @var Service $service */
        $service = $this->route('service');

        return $service;
    }
}
