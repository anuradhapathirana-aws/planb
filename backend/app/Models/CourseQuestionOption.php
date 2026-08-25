<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CourseQuestionOptionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseQuestionOption extends Model
{
    /** @use HasFactory<CourseQuestionOptionFactory> */
    use HasFactory;

    protected $fillable = [
        'course_question_id',
        'text',
        'is_correct',
        'sort_order',
    ];

    protected $attributes = [
        'is_correct' => false,
    ];

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
        ];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(CourseQuestion::class, 'course_question_id');
    }
}
