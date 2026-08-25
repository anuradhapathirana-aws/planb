<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CoursePaperFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CoursePaper extends Model
{
    /** @use HasFactory<CoursePaperFactory> */
    use HasFactory;

    public const DEFAULT_PASS_MARK = 70;

    protected $fillable = [
        'course_programme_id',
        'title',
        'instructions',
        'pass_mark',
        'max_attempts',
        'requires_all_videos_watched',
    ];

    /** Mirrors the column defaults so a freshly created model already reports them. */
    protected $attributes = [
        'pass_mark' => self::DEFAULT_PASS_MARK,
        'requires_all_videos_watched' => true,
    ];

    protected function casts(): array
    {
        return [
            'pass_mark' => 'integer',
            'max_attempts' => 'integer',
            'requires_all_videos_watched' => 'boolean',
        ];
    }

    public function programme(): BelongsTo
    {
        return $this->belongsTo(CourseProgramme::class, 'course_programme_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(CourseQuestion::class)->orderBy('sort_order');
    }
}
