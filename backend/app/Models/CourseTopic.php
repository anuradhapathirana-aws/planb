<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CourseTopicFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseTopic extends Model
{
    /** @use HasFactory<CourseTopicFactory> */
    use HasFactory;

    protected $fillable = [
        'course_programme_id',
        'title',
        'description',
        'sort_order',
    ];

    public function programme(): BelongsTo
    {
        return $this->belongsTo(CourseProgramme::class, 'course_programme_id');
    }

    public function videos(): HasMany
    {
        return $this->hasMany(CourseVideo::class)->orderBy('sort_order');
    }
}
