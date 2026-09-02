<?php

declare(strict_types=1);

namespace App\Http\Requests\Service;

use App\Enums\ServiceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Shared rules for the Add/Edit Service form.
 *
 * The thumbnail is not part of this payload — it is uploaded against a saved
 * service on its own endpoint, the same arrangement course art uses, so a
 * multi-MB image does not ride along with every wording tweak.
 */
abstract class ServiceRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => $this->nameRules(),
            'summary' => ['nullable', 'string', 'max:300'],

            // Rich-text HTML, sanitized server-side before storage. The cap is
            // generous because it counts markup, not the words the admin typed.
            'description' => ['nullable', 'string', 'max:20000'],

            /*
             * Smallest currency unit, integer (root CLAUDE.md §4.11), and at
             * least 1: a service exists to be paid for. Zero would open an order
             * `OrderService` refuses, leaving the student with a button that
             * does nothing. Capped well above any realistic fee so a stray extra
             * zero is caught here rather than by a student.
             */
            'price_cents' => ['required', 'integer', 'min:1', 'max:100000000'],
            'currency' => ['nullable', 'string', 'size:3', Rule::in([config('payments.currency')])],

            'delivery_time' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(ServiceStatus::values())],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /** @return list<mixed> */
    abstract protected function nameRules(): array;

    public function messages(): array
    {
        return [
            'name.required' => 'Enter a service name.',
            'name.unique' => 'A service with that name already exists.',
            'price_cents.required' => 'Enter a price for this service.',
            'price_cents.min' => 'A service needs a price above zero — students pay for each one.',
            'price_cents.integer' => 'Enter the price as a number.',
            'currency.in' => 'Prices are only supported in '.config('payments.currency').' right now.',
        ];
    }

    public function attributes(): array
    {
        return [
            'price_cents' => 'price',
            'delivery_time' => 'delivery time',
        ];
    }
}
