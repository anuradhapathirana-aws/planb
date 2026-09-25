<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasTranslatedText;
use App\Services\Settings\TeamMemberService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * One person on the public website's "The Team" carousel.
 *
 * {@see TeamMemberService} is the only thing that reads or writes this.
 */
class TeamMember extends Model implements HasMedia
{
    use HasTranslatedText;
    use InteractsWithMedia;

    public const PHOTO_COLLECTION = 'photo';

    protected $fillable = [
        'name',
        'role',
        'role_si',
        'is_visible',
        'sort_order',
    ];

    protected $attributes = [
        'is_visible' => false,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'is_visible' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function registerMediaCollections(): void
    {
        // Public disk: a staff photograph published on the company website with
        // the person's consent, not a student's private document.
        $this->addMediaCollection(self::PHOTO_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png']);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::PHOTO_COLLECTION)?->getUrl();
    }

    /**
     * @param  Builder<TeamMember>  $query
     * @return Builder<TeamMember>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * A card is a photograph with a name under it. Without the photograph there
     * is no card — the carousel would show a grey rectangle among faces, which
     * looks like a loading failure rather than a design.
     */
    public function isPublishable(): bool
    {
        return $this->is_visible && $this->photo_url !== null;
    }
}
