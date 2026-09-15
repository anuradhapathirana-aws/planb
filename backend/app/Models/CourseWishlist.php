<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\Course\CourseWishlistService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One course on one student's wishlist.
 *
 * Written only by {@see CourseWishlistService}. The row's existence is the whole
 * fact — there is no state column; removing an entry deletes it.
 */
class CourseWishlist extends Model
{
    protected $fillable = [
        'student_id',
        'course_programme_id',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function programme(): BelongsTo
    {
        return $this->belongsTo(CourseProgramme::class, 'course_programme_id');
    }
}
