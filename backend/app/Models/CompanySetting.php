<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\IntroAnimation;
use App\Services\Settings\CompanySettingsService;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * Plan B's company configuration — bank details, logo and the app intro.
 *
 * A singleton row. {@see CompanySettingsService} is the only thing that reads
 * or writes it; nothing else may call `CompanySetting::create()`.
 */
class CompanySetting extends Model implements HasMedia
{
    use InteractsWithMedia;

    public const LOGO_COLLECTION = 'logo';

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
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::LOGO_COLLECTION)?->getUrl();
    }
}
