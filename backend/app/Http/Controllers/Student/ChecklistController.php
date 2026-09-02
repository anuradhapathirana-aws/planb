<?php

declare(strict_types=1);

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\ToggleChecklistItemRequest;
use App\Http\Resources\Student\StudentChecklistItemResource;
use App\Http\Resources\Student\StudentChecklistPhaseResource;
use App\Models\ChecklistItem;
use App\Models\Student;
use App\Services\Checklist\StudentChecklistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The Before Arrival / After Arrival checklists, for the student working
 * through them.
 *
 * There is no entitlement check here and that is deliberate: the checklists are
 * Plan B's migration guidance, not purchased content, so every signed-in
 * student sees both phases. What *is* scoped per student is the ticks — every
 * read and write goes through the authenticated `Student`, never an id from the
 * request (root CLAUDE.md §4.9).
 */
class ChecklistController extends Controller
{
    public function __construct(private readonly StudentChecklistService $checklists) {}

    /** Both phases in one response — the app renders them as two tabs. */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => StudentChecklistPhaseResource::collection(
                $this->checklists->overviewFor($this->student($request)),
            ),
        ]);
    }

    /**
     * Tick one step on or off.
     *
     * Answers with the step *and* the phase's recomputed progress, so the app's
     * progress ring is re-seeded from the server rather than adjusted locally —
     * the same reasoning as the player's progress flush.
     */
    public function update(
        ToggleChecklistItemRequest $request,
        ChecklistItem $checklistItem,
    ): JsonResponse {
        $student = $this->student($request);

        $this->checklists->setCompletion(
            $student,
            $checklistItem,
            $request->boolean('is_completed'),
        );

        return response()->json([
            'data' => [
                'item' => new StudentChecklistItemResource($checklistItem),
                'progress' => [
                    'phase' => $checklistItem->phase->value,
                    ...$this->checklists->progressFor($student, $checklistItem->phase),
                ],
            ],
        ]);
    }

    private function student(Request $request): Student
    {
        /** @var Student $student — guaranteed by the `student.actor` middleware. */
        $student = $request->user();

        return $student;
    }
}
