<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ProfessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Profession extends Model
{
    /** @use HasFactory<ProfessionFactory> */
    use HasFactory;

    protected $fillable = [
        'industry_id',
        'name',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }
}
