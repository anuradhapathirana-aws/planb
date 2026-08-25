<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\ChecklistPhase;
use App\Http\Controllers\Controller;
use App\Http\Requests\Checklist\SaveChecklistItemsRequest;
use App\Http\Resources\ChecklistItemResource;
use App\Models\ChecklistItem;
use App\Services\Checklist\ChecklistItemService;
use Illuminate\Http\JsonResponse;

/**
 * Each arrival checklist is one document keyed by phase, not a paginated
 * resource: the admin sees the whole list in a tab, reorders it and saves once.
 * `{phase}` is resolved by implicit enum binding, so an unknown phase 404s.
 */
class ChecklistItemController extends Controller
{
    public function __construct(private readonly ChecklistItemService $items) {}

    public function index(ChecklistPhase $phase): JsonResponse
    {
        $this->authorize('viewAny', ChecklistItem::class);

        return response()->json([
            'data' => ChecklistItemResource::collection($this->items->listFor($phase)),
        ]);
    }

    public function update(SaveChecklistItemsRequest $request, ChecklistPhase $phase): JsonResponse
    {
        $items = $this->items->sync($phase, $request->validated()['items']);

        return response()->json(['data' => ChecklistItemResource::collection($items)]);
    }
}
