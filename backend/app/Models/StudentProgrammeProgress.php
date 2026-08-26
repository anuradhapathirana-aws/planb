<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentProgrammeProgress extends Model
{
    use HasFactory;

    protected $table = 'student_programme_progress';

    protected $fillable = [
        'student_id',
        'course_programme_id',
        'started_at',
        'last_course_video_id',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function programme(): BelongsTo
    {
        return $this->belongsTo(CourseProgramme::class, 'course_programme_id');
    }

    public function lastVideo(): BelongsTo
    {
        return $this->belongsTo(CourseVideo::class, 'last_course_video_id');
    }
}
