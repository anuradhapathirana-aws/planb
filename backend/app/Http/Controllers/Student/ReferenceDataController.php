<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\Student\StudentReferenceResource;
use App\Models\Industry;
use App\Models\Profession;
use Illuminate\Http\JsonResponse;

/**
 * Read-only lists the student's profile form needs.
 *
 * Separate from the admin endpoints, which require an admin role and expose
 * inactive rows. Students only ever see active options: offering one that an
 * admin has retired would let a student pick something Plan B no longer places.
 *
 * Not paginated — these are short, stable lists, and a picker that paginates is
 * a worse picker.
 */
class ReferenceDataController extends Controller
{
    public function industries(): JsonResponse
    {
        return response()->json([
            'data' => StudentReferenceResource::collection(
                Industry::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            ),
        ]);
    }

    public function professions(): JsonResponse
    {
        return response()->json([
            'data' => StudentReferenceResource::collection(
                Profession::where('is_active', true)
                    ->whereHas('industry', fn ($query) => $query->where('is_active', true))
                    ->orderBy('name')
                    ->get(['id', 'industry_id', 'name']),
            ),
        ]);
    }
}
