<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ReorderTeamMembersRequest;
use App\Http\Requests\Settings\SaveTeamMemberRequest;
use App\Http\Requests\Settings\UploadTeamMemberPhotoRequest;
use App\Http\Resources\TeamMemberResource;
use App\Models\TeamMember;
use App\Services\Settings\TeamMemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Website Configuration > The Team.
 *
 * Same shape as {@see SiteHeroSlideController}: an ordered collection, wording
 * and photograph saved separately, and `reorder` rewriting the whole sequence.
 */
class TeamMemberController extends Controller
{
    public function __construct(private readonly TeamMemberService $members) {}

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('view', TeamMember::class);

        return TeamMemberResource::collection($this->members->all());
    }

    public function show(TeamMember $teamMember): JsonResponse
    {
        $this->authorize('view', TeamMember::class);

        return response()->json(['data' => new TeamMemberResource($teamMember)]);
    }

    public function store(SaveTeamMemberRequest $request): JsonResponse
    {
        return response()->json(
            ['data' => new TeamMemberResource($this->members->create($request->validated()))],
            201,
        );
    }

    public function update(SaveTeamMemberRequest $request, TeamMember $teamMember): JsonResponse
    {
        return response()->json([
            'data' => new TeamMemberResource($this->members->update($teamMember, $request->validated())),
        ]);
    }

    public function destroy(TeamMember $teamMember): JsonResponse
    {
        $this->authorize('manage', TeamMember::class);

        $this->members->delete($teamMember);

        return response()->json(null, 204);
    }

    public function reorder(ReorderTeamMembersRequest $request): AnonymousResourceCollection
    {
        /** @var list<int> $ids */
        $ids = $request->validated('ids');

        $this->members->reorder($ids);

        return TeamMemberResource::collection($this->members->all());
    }

    public function uploadPhoto(
        UploadTeamMemberPhotoRequest $request,
        TeamMember $teamMember,
    ): JsonResponse {
        return response()->json([
            'data' => new TeamMemberResource(
                $this->members->updatePhoto($teamMember, $request->file('photo')),
            ),
        ]);
    }

    public function deletePhoto(TeamMember $teamMember): JsonResponse
    {
        $this->authorize('manage', TeamMember::class);

        return response()->json([
            'data' => new TeamMemberResource($this->members->removePhoto($teamMember)),
        ]);
    }
}
