<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use App\Support\PlainText;
use Closure;

/**
 * The `bio` field is one column written from two places — the admin student
 * form and the student's own profile screen — so its rules live in one place
 * too. Letting the three Form Requests each carry their own copy is how the
 * admin path ends up with a weaker cap than the student path.
 */
trait NormalizesBio
{
    /** Mirrored by `studentFormSchema` on web and `studentProfileSchema` in shared/. */
    public const BIO_MAX_CHARS = 500;

    /**
     * @param  bool  $partial  True for a PATCH-style request, where an absent
     *                         bio means "leave it alone" rather than "clear it".
     * @return array<int, mixed>
     */
    protected function bioRules(bool $partial = false): array
    {
        return [
            ...($partial ? ['sometimes'] : []),
            'nullable',
            'string',
            'max:'.self::BIO_MAX_CHARS,
            function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value)) {
                    return;
                }

                if (! PlainText::isValidUtf8($value)) {
                    $fail('This text contains characters we cannot store. Please retype it.');

                    return;
                }

                // The bio is rendered as text on every surface, so markup here is
                // either a paste accident or someone probing. Rejected rather than
                // stripped: silently deleting part of what an admin typed is worse
                // than telling them why it was not saved.
                if (PlainText::containsMarkup($value)) {
                    $fail('Use plain text only — HTML tags are not allowed here.');
                }
            },
        ];
    }

    /**
     * Cleans the bio before the rules above run, so `max:` measures the value
     * that will actually be stored. Runs only when the field was sent: merging
     * unconditionally would turn an absent bio into an explicit null and clear
     * a field the caller never mentioned.
     */
    protected function normalizeBio(): void
    {
        if (! $this->has('bio')) {
            return;
        }

        $bio = $this->input('bio');

        if ($bio === null || is_string($bio)) {
            $this->merge(['bio' => PlainText::clean($bio)]);
        }
    }
}
