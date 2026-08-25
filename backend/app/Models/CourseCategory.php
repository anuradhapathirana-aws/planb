<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CourseCategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseCategory extends Model
{
    /** @use HasFactory<CourseCategoryFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'is_active',
        'sort_order',
    ];

    /**
     * Mirrors the column defaults so a freshly created model already reports
     * them, instead of returning null until it is reloaded from the database.
     */
    protected $attributes = [
        'is_active' => true,
        'sort_order' => 0,
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function programmes(): HasMany
    {
        return $this->hasMany(CourseProgramme::class);
    }
}
