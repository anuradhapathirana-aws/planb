<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VideoProcessingStatus;
use App\Enums\VideoProvider;
use Database\Factories\CourseVideoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class CourseVideo extends Model implements HasMedia
{
    /** @use HasFactory<CourseVideoFactory> */
    use HasFactory, InteractsWithMedia;

    /** Private disk holding uploaded lesson files — never publicly reachable. */
    public const VIDEO_DISK = 'course_videos';

    public const VIDEO_COLLECTION = 'video_file';

    public const THUMBNAIL_COLLECTION = 'thumbnail';

    protected $fillable = [
        'course_topic_id',
        'title',
        'provider',
        'external_url',
        'external_id',
        'processing_status',
        'duration_seconds',
        'sort_order',
    ];

    /**
     * Mirrors the column defaults in memory. A row created without these — the
     * Course form saves lesson rows before any file exists — would otherwise
     * carry null until it was read back, and the enum cast has nothing to cast.
     */
    protected $attributes = [
        'provider' => 'upload',
        'processing_status' => 'ready',
    ];

    protected function casts(): array
    {
        return [
            'provider' => VideoProvider::class,
            'processing_status' => VideoProcessingStatus::class,
            'duration_seconds' => 'integer',
        ];
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(CourseTopic::class, 'course_topic_id');
    }

    public function registerMediaCollections(): void
    {
        // Lesson files stay on a private disk. Playback only ever happens through
        // a short-lived signed URL (CLAUDE.md §7.11), never a direct file URL.
        $this->addMediaCollection(self::VIDEO_COLLECTION)
            ->singleFile()
            ->useDisk(self::VIDEO_DISK)
            ->acceptsMimeTypes(['video/mp4', 'video/quicktime']);

        $this->addMediaCollection(self::THUMBNAIL_COLLECTION)
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png']);
    }

    public function videoMedia(): ?Media
    {
        return $this->getFirstMedia(self::VIDEO_COLLECTION);
    }

    /** True for a Bunny-hosted lesson, whatever state its encoding is in. */
    public function isRemotelyHosted(): bool
    {
        return $this->provider === VideoProvider::External && $this->external_id !== null;
    }

    /**
     * "There is a lesson here to play." Deliberately blind to *where* it lives:
     * callers asking this question — publishing checks, the stream endpoint, the
     * Resource's `has_file` — care that a student would get a video, not which
     * host serves it.
     */
    public function hasVideoFile(): bool
    {
        return $this->isRemotelyHosted() || $this->videoMedia() !== null;
    }

    /** Uploaded, encoded and actually playable right now. */
    public function isPlayable(): bool
    {
        return $this->hasVideoFile() && $this->processing_status->isPlayable();
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->getFirstMedia(self::THUMBNAIL_COLLECTION)?->getUrl();
    }
}
