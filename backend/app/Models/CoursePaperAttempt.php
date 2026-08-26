<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AttemptStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CoursePaperAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'course_paper_id',
        'attempt_number',
        'status',
        'pass_mark_snapshot',
        'total_questions',
        'correct_answers',
        'score_percent',
        'is_passed',
        'started_at',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => AttemptStatus::class,
            'attempt_number' => 'integer',
            'pass_mark_snapshot' => 'integer',
            'total_questions' => 'integer',
            'correct_answers' => 'integer',
            'score_percent' => 'integer',
            'is_passed' => 'boolean',
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function paper(): BelongsTo
    {
        return $this->belongsTo(CoursePaper::class, 'course_paper_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(CoursePaperAnswer::class);
    }

    /** @param  Builder<CoursePaperAttempt>  $query */
    public function scopeSubmitted(Builder $query): void
    {
        $query->where('status', AttemptStatus::Submitted);
    }

    /** @param  Builder<CoursePaperAttempt>  $query */
    public function scopeInProgress(Builder $query): void
    {
        $query->where('status', AttemptStatus::InProgress);
    }
}
