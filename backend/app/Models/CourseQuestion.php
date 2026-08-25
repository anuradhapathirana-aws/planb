<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\QuestionType;
use Database\Factories\CourseQuestionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseQuestion extends Model
{
    /** @use HasFactory<CourseQuestionFactory> */
    use HasFactory;

    protected $fillable = [
        'course_paper_id',
        'text',
        'type',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'type' => QuestionType::class,
        ];
    }

    public function paper(): BelongsTo
    {
        return $this->belongsTo(CoursePaper::class, 'course_paper_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(CourseQuestionOption::class)->orderBy('sort_order');
    }
}
