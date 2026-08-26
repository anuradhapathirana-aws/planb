<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\Course\CourseProgressService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One student's progress through one lesson.
 *
 * Written only by {@see CourseProgressService}, which
 * clamps every value before it lands here.
 */
class StudentVideoProgress extends Model
{
    use HasFactory;

    protected $table = 'student_video_progress';

    protected $fillable = [
        'student_id',
        'course_video_id',
        'max_position_seconds',
        'watched_seconds',
        'duration_seconds',
        'is_watched',
        'watched_at',
        'last_seen_at',
    ];

    protected $attributes = [
        'max_position_seconds' => 0,
        'watched_seconds' => 0,
        'is_watched' => false,
    ];

    protected function casts(): array
    {
        return [
            'max_position_seconds' => 'integer',
            'watched_seconds' => 'integer',
            'duration_seconds' => 'integer',
            'is_watched' => 'boolean',
            'watched_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function video(): BelongsTo
    {
        return $this->belongsTo(CourseVideo::class, 'course_video_id');
    }
}
