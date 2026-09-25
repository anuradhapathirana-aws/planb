<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\TeamMember;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The carousel's new order, as the sequence of member ids the admin is looking
 * at. Position in the array is the order (root CLAUDE.md §8).
 */
class ReorderTeamMembersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', TeamMember::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', Rule::exists('team_members', 'id')],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var list<int> $ids */
                $ids = $this->input('ids', []);

                if (count($ids) !== count(array_unique($ids))) {
                    $validator->errors()->add('ids', 'The same person was listed more than once.');

                    return;
                }

                if (count($ids) !== TeamMember::query()->count()) {
                    $validator->errors()->add('ids', 'Send every person, in the order they should appear.');
                }
            },
        ];
    }
}
