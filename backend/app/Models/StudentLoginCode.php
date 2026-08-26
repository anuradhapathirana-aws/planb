<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A one-time sign-in code emailed to a student.
 *
 * Only ever holds a hash of the code. Nothing here is exposed through an API
 * Resource — the client learns only that *a* code was sent.
 */
class StudentLoginCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'email',
        'code_hash',
        'attempts',
        'expires_at',
        'consumed_at',
        'voided_at',
        'request_ip',
    ];

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /** Neither used nor superseded — there is at most one of these per student. */
    public function scopeLive(Builder $query): void
    {
        $query->whereNull('consumed_at')->whereNull('voided_at');
    }

    public function isUsable(): bool
    {
        return $this->consumed_at === null
            && $this->voided_at === null
            && $this->expires_at->isFuture();
    }
}
