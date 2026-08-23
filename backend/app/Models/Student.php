<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VisaStatus;
use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Student extends Model implements HasMedia
{
    /** @use HasFactory<StudentFactory> */
    use HasFactory, InteractsWithMedia, SoftDeletes;

    protected $fillable = [
        'student_id',
        'full_name',
        'email',
        'contact_number',
        'address',
        'date_of_birth',
        'highest_qualification',
        'industry_id',
        'profession_id',
        'visa_status',
        'languages_spoken',
        'is_blocked',
        'registered_at',
        'imported_by',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'visa_status' => VisaStatus::class,
            'languages_spoken' => 'array',
            'is_blocked' => 'boolean',
            'registered_at' => 'datetime',
        ];
    }

    public function importedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }

    public function profession(): BelongsTo
    {
        return $this->belongsTo(Profession::class);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('profile_photo')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png']);
    }

    public function getProfilePhotoUrlAttribute(): ?string
    {
        $media = $this->getFirstMedia('profile_photo');

        return $media?->getUrl();
    }

    public function isRegistered(): bool
    {
        return $this->registered_at !== null;
    }
}
