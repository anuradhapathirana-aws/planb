<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Course\SaveCoursePaperRequest;
use App\Http\Resources\CoursePaperResource;
use App\Models\CourseProgramme;
use App\Services\Course\CoursePaperService;
use Illuminate\Http\JsonResponse;

/**
 * The Q&A paper is a singleton under its programme: at most one, and often
 * none. `show` therefore answers with `data: null` rather than a 404 — "this
 * programme has no paper" is a normal state the builder starts from, not an error.
 */
class CoursePaperController extends Controller
{
    public function __construct(private readonly CoursePaperService $papers) {}

    public function show(CourseProgramme $programme): JsonResponse
    {
        $this->authorize('view', $programme);

        $paper = $programme->paper;

        return response()->json([
            'data' => $paper ? new CoursePaperResource($this->papers->loadTree($paper)) : null,
        ]);
    }

    public function update(SaveCoursePaperRequest $request, CourseProgramme $programme): JsonResponse
    {
        $paper = $this->papers->save($programme, $request->validated());

        return response()->json(['data' => new CoursePaperResource($paper)]);
    }

    public function destroy(CourseProgramme $programme): JsonResponse
    {
        $this->authorize('update', $programme);

        $paper = $programme->paper;

        abort_if($paper === null, 404);

        $this->papers->delete($paper);

        return response()->json(null, 204);
    }
}
