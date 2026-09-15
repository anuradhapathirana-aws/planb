<?php

declare(strict_types=1);

namespace App\Services\Settings;

use App\Models\CompanySetting;
use Illuminate\Http\UploadedFile;
use Intervention\Image\ImageManager;

/**
 * The one way in and out of Plan B's company configuration.
 *
 * The table holds exactly one row. The migration inserts it, and `current()`
 * recreates it if it is ever missing, so no caller has to handle "not set up".
 */
class CompanySettingsService
{
    /**
     * Fits inside 512x512, never upscaled. Large enough for the intro screen's
     * hero logo on a high-density phone, small enough to be the first download
     * of every cold start.
     */
    private const LOGO_MAX_SIZE = 512;

    public function current(): CompanySetting
    {
        return CompanySetting::query()->oldest('id')->first() ?? CompanySetting::create();
    }

    public function bankTransferEnabled(): bool
    {
        return $this->current()->bank_transfer_enabled;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateBankDetails(array $data): CompanySetting
    {
        $settings = $this->current();

        $settings->fill([
            'bank_transfer_enabled' => $data['bank_transfer_enabled'],
            'bank_name' => $data['bank_name'] ?? null,
            'bank_account_name' => $data['bank_account_name'] ?? null,
            'bank_account_number' => $data['bank_account_number'] ?? null,
            'bank_branch' => $data['bank_branch'] ?? null,
            'bank_notes' => $data['bank_notes'] ?? null,
        ])->save();

        return $settings;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateAppIntro(array $data): CompanySetting
    {
        $settings = $this->current();

        $settings->fill([
            'intro_is_enabled' => $data['intro_is_enabled'],
            'intro_greeting_en' => $data['intro_greeting_en'] ?? null,
            'intro_greeting_si' => $data['intro_greeting_si'] ?? null,
            'intro_animation' => $data['intro_animation'],
        ])->save();

        return $settings;
    }

    /**
     * Re-encoded before storing (root CLAUDE.md §7.4). PNG rather than JPEG
     * because a logo needs its transparency — it sits on navy in the admin
     * sidebar and on white in the app.
     */
    public function updateLogo(UploadedFile $file): CompanySetting
    {
        $settings = $this->current();

        $encoded = ImageManager::gd()
            ->read($file->getRealPath())
            ->scaleDown(self::LOGO_MAX_SIZE, self::LOGO_MAX_SIZE)
            ->toPng();

        $tempPath = tempnam(sys_get_temp_dir(), 'planb_logo_').'.png';
        file_put_contents($tempPath, (string) $encoded);

        $settings->addMedia($tempPath)
            ->usingFileName('logo.png')
            ->toMediaCollection(CompanySetting::LOGO_COLLECTION);

        // Bumps `updated_at`, which the app uses to know its cached logo is stale.
        $settings->touch();

        return $settings->fresh() ?? $settings;
    }

    public function removeLogo(): CompanySetting
    {
        $settings = $this->current();

        $settings->clearMediaCollection(CompanySetting::LOGO_COLLECTION);
        $settings->touch();

        return $settings->fresh() ?? $settings;
    }
}
