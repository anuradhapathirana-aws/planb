<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\IntroAnimation;
use App\Models\Concerns\HasTranslatedText;
use App\Services\Settings\CompanySettingsService;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * Plan B's company configuration — bank details, logo, the app intro, and the
 * website's "Community & trust" band.
 *
 * A singleton row. {@see CompanySettingsService} is the only thing that reads
 * or writes it; nothing else may call `CompanySetting::create()`.
 *
 * The `community_*` columns are the website's About section. They live here
 * rather than in a second settings table because they are about-the-company
 * copy and there is exactly one of them — two singleton tables would be two
 * rows to keep in step with no rule for which owns what.
 */
class CompanySetting extends Model implements HasMedia
{
    use HasTranslatedText;
    use InteractsWithMedia;

    public const LOGO_COLLECTION = 'logo';

    /** The still frame shown before the About video is played. */
    public const COMMUNITY_POSTER_COLLECTION = 'community_poster';

    protected $fillable = [
        'bank_transfer_enabled',
        'bank_name',
        'bank_account_name',
        'bank_account_number',
        'bank_branch',
        'bank_notes',
        'intro_is_enabled',
        'intro_greeting_en',
        'intro_greeting_si',
        'intro_animation',
        'community_eyebrow',
        'community_eyebrow_si',
        'community_heading',
        'community_heading_si',
        'community_body',
        'community_body_si',
        'community_video_url',
        'community_video_duration_label',
        'community_floating_label',
        'community_floating_label_si',
    ];

    protected $attributes = [
        'bank_transfer_enabled' => true,
        'intro_is_enabled' => true,
        'intro_animation' => IntroAnimation::Fade->value,
    ];

    protected function casts(): array
    {
        return [
            'bank_transfer_enabled' => 'boolean',
            'intro_is_enabled' => 'boolean',
            'intro_animation' => IntroAnimation::class,
        ];
    }

    public function registerMediaCollections(): void
    {
        // Public disk: the logo is shown on the admin login page and to every
        // student, so there is nothing to protect.
        $this->addMediaCollection(self::LOGO_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/png']);

        // Public disk for the same reason: it is the still frame on the
        // company's front page, seen before anyone presses play.
        $this->addMediaCollection(self::COMMUNITY_POSTER_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png']);
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::LOGO_COLLECTION)?->getUrl();
    }

    public function getCommunityPosterUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::COMMUNITY_POSTER_COLLECTION)?->getUrl();
    }
}
