<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EnrolmentSource;
use Database\Factories\EnrolmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A student's access to one course programme. Access does not expire.
 *
 * Concrete rather than polymorphic on purpose: enrolment is a course concept.
 * A premium service produces a fulfilment/deliverable, not an enrolment, so
 * giving it its own model later is clearer than overloading this one.
 */
class Enrolment extends Model
{
    /** @use HasFactory<EnrolmentFactory> */
    use HasFactory;

    protected $fillable = [
        'student_id',
        'course_programme_id',
        'order_id',
        'source',
        'granted_by',
        'enrolled_at',
    ];

    protected $attributes = [
        'source' => EnrolmentSource::Purchase->value,
    ];

    protected function casts(): array
    {
        return [
            'source' => EnrolmentSource::class,
            'enrolled_at' => 'datetime',
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

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function grantedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'granted_by');
    }
}
