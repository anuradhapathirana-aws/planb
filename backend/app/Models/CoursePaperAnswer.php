<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CoursePaperAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_paper_attempt_id',
        'course_question_id',
        'course_question_option_id',
        'question_text_snapshot',
        'option_text_snapshot',
        'is_correct',
    ];

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(CoursePaperAttempt::class, 'course_paper_attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(CourseQuestion::class, 'course_question_id');
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(CourseQuestionOption::class, 'course_question_option_id');
    }
}
