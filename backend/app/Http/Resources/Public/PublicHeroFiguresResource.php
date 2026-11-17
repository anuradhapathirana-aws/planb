<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Http\Resources\CompanySettingResource;
use App\Models\CompanySetting;
use App\Support\Locale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The website hero's figures strip, for an anonymous visitor.
 *
 * Reads the `company_settings` singleton, which also holds Plan B's bank
 * account, so like {@see PublicCommunityResource} it names exactly what it
 * sends: the `hero_figures` column and nothing else. Never swap in
 * {@see CompanySettingResource}.
 *
 * One language, picked by the server: a blank Sinhala label falls back to the
 * English one, the same rule `HasTranslatedText::translated()` applies to
 * columns.
 *
 * Only built when figures have been saved. `SiteContentController` sends null
 * when they never have (the website keeps its built-in figures), and an empty
 * list hides the strip. The two mean different things, so neither is
 * flattened into the other.
 *
 * @mixin CompanySetting
 */
class PublicHeroFiguresResource extends JsonResource
{
    /**
     * @return list<array{value: string, label: string}>
     */
    public function toArray(Request $request): array
    {
        /** @var list<array{value: string, label: string, label_si: string|null}> $figures */
        $figures = $this->hero_figures ?? [];

        $sinhala = Locale::isSinhala();

        return array_map(function (array $figure) use ($sinhala): array {
            $label = $figure['label'];

            if ($sinhala && trim((string) ($figure['label_si'] ?? '')) !== '') {
                $label = (string) $figure['label_si'];
            }

            return ['value' => $figure['value'], 'label' => $label];
        }, $figures);
    }
}
