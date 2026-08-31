<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VisaStatus;
use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * A student record, and — since the mobile app — an authenticatable actor.
 *
 * Extends `Foundation\Auth\User` (which is itself an Eloquent `Model`), so the
 * media collections, soft deletes, casts and relations below are unaffected.
 * Students authenticate by emailed code or Google, never by password, and are
 * kept strictly apart from admin `User`s — see `backend/CLAUDE.md`.
 */
class Student extends Authenticatable implements HasMedia
{
    /** @use HasFactory<StudentFactory> */
    use HasApiTokens, HasFactory, InteractsWithMedia, Notifiable, SoftDeletes;

    /**
     * `google_sub` and `email_verified_at` are deliberately absent: only
     * `StudentAuthService` writes them, via `forceFill`, so no admin form or CSV
     * import can reach the fields that decide who owns an account.
     */
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
            'email_verified_at' => 'datetime',
        ];
    }

    /*
     * `students` has no password and no remember_token column, and never will:
     * possession of the mailbox (or the Google account) is the credential. These
     * three overrides keep the Authenticatable contract satisfied without them.
     */

    public function getAuthPassword(): string
    {
        return '';
    }

    public function getRememberToken(): ?string
    {
        return null;
    }

    public function setRememberToken($value): void
    {
        // No column to write to.
    }

    public function getRememberTokenName(): ?string
    {
        return null;
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

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class)->latest('id');
    }

    public function enrolments(): HasMany
    {
        return $this->hasMany(Enrolment::class);
    }

    /** Courses this student has paid for (or been granted). */
    public function enrolledProgrammes(): BelongsToMany
    {
        return $this->belongsToMany(CourseProgramme::class, 'enrolments')
            ->withPivot(['order_id', 'source', 'enrolled_at'])
            ->withTimestamps();
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

    public function loginCodes(): HasMany
    {
        return $this->hasMany(StudentLoginCode::class);
    }

    public function paperAttempts(): HasMany
    {
        return $this->hasMany(CoursePaperAttempt::class);
    }

    public function videoProgress(): HasMany
    {
        return $this->hasMany(StudentVideoProgress::class);
    }

    public function programmeProgress(): HasMany
    {
        return $this->hasMany(StudentProgrammeProgress::class);
    }

    /** @param  Builder<Student>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_blocked', false);
    }

    /**
     * Whether this record may hold a session at all. Checked when a code is
     * requested, again when it is verified, and again by `EnsureStudentIsActive`
     * on every authenticated request — a token issued before a block must stop
     * working the moment the block lands.
     */
    public function canSignIn(): bool
    {
        return ! $this->is_blocked && $this->deleted_at === null;
    }

    /** A student with no email on file has no way to receive a sign-in code. */
    public function canSelfRegister(): bool
    {
        return $this->email !== null && $this->email !== '';
    }
}
