<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use App\Models\CompanySetting;
use App\Support\YouTube;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * The website's "Community & trust" band — Website Configuration > About Video.
 */
class UpdateWebsiteContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Website copy is content work, same permission as the logo and the app
        // intro. It is deliberately NOT `manageBankDetails`.
        return $this->user()->can('manageBranding', CompanySetting::class);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'community_eyebrow' => ['nullable', 'string', 'max:60'],
            'community_eyebrow_si' => ['nullable', 'string', 'max:60'],
            'community_heading' => ['nullable', 'string', 'max:160'],
            'community_heading_si' => ['nullable', 'string', 'max:160'],
            'community_body' => ['nullable', 'string', 'max:1000'],
            'community_body_si' => ['nullable', 'string', 'max:1000'],

            /*
             * `url:http,https` is the first gate and rejects `javascript:` and
             * `data:`. It is not sufficient on its own — the `after()` hook
             * below is what confirms the link is actually a YouTube video.
             */
            'community_video_url' => ['nullable', 'string', 'max:2048', 'url:http,https'],

            // A display label, not a parsed duration: "1:58".
            'community_video_duration_label' => ['nullable', 'string', 'max:12', 'regex:/^\d{1,2}:\d{2}$/'],

            'community_floating_label' => ['nullable', 'string', 'max:60'],
            'community_floating_label_si' => ['nullable', 'string', 'max:60'],
        ];
    }

    /**
     * Rules the array syntax cannot express (root CLAUDE.md §8).
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $this->validateVideoUrl($validator);
                $this->validateHighlightMarkers($validator);
            },
        ];
    }

    public function messages(): array
    {
        return [
            'community_video_url.url' => 'Enter a full web address starting with http:// or https://.',
            'community_video_duration_label.regex' => 'Write the length as minutes and seconds, like 1:58.',
        ];
    }

    /**
     * The pasted link has to parse to a YouTube video id.
     *
     * The website parses it again in the browser before it reaches an iframe,
     * and **that** check is the one protecting the visitor. This one stops a
     * link no client can ever play from being stored at all, so the admin finds
     * out at save time instead of a visitor finding out on the front page.
     * Neither check may be removed because the other exists (root §7.3).
     */
    private function validateVideoUrl(Validator $validator): void
    {
        $url = trim((string) $this->input('community_video_url'));

        // Blank is valid: the section falls back to its designed panel.
        if ($url === '') {
            return;
        }

        if (! YouTube::isValidUrl($url)) {
            $validator->errors()->add(
                'community_video_url',
                'Paste a YouTube video link, for example https://www.youtube.com/watch?v=xxxxxxxxxxx.',
            );
        }
    }

    /**
     * `**word**` marks the gold segment. An odd number of markers leaves one
     * unclosed and the website prints the asterisks — a mistake the admin would
     * only find on the live page.
     */
    private function validateHighlightMarkers(Validator $validator): void
    {
        foreach (['community_heading', 'community_heading_si'] as $field) {
            $value = (string) $this->input($field);

            if ($value !== '' && substr_count($value, '**') % 2 !== 0) {
                $validator->errors()->add(
                    $field,
                    'Highlighted words need ** on both sides, like **this**.',
                );
            }
        }
    }
}
