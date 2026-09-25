<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\Public\PublicCommunityResource;
use App\Http\Resources\Public\PublicHeroSlideResource;
use App\Http\Resources\Public\PublicTeamMemberResource;
use App\Services\Settings\CompanySettingsService;
use App\Services\Settings\SiteHeroSlideService;
use App\Services\Settings\TeamMemberService;
use Illuminate\Http\JsonResponse;

/**
 * The public website's admin-managed content, in one request.
 *
 * **One endpoint, not three.** These three blocks are all above or near the
 * fold of the same page, so three requests would mean three round trips before
 * the home page settles, on a connection we do not control. The payload is a
 * few kilobytes.
 *
 * **Anonymous, and that is the whole design constraint.** Every field here was
 * written by an admin for publication — there is no student, no enrolment and
 * no PII. The Resources are the enforcement point: each one names the fields it
 * sends, so adding a column to `company_settings` (which also holds Plan B's
 * bank account) cannot silently publish it. Never reuse an admin or student
 * Resource on this route (root CLAUDE.md §16.4).
 *
 * There is **no authorization check** and that is correct: this is a marketing
 * page's content. Visibility is enforced in the query instead — the Services'
 * `live()` methods return only rows an admin switched on, and only ones
 * complete enough to render, the same "scope is the authorization" pattern the
 * student course routes use (backend/CLAUDE.md §2).
 */
class SiteContentController extends Controller
{
    public function __construct(
        private readonly SiteHeroSlideService $slides,
        private readonly TeamMemberService $team,
        private readonly CompanySettingsService $settings,
    ) {}

    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => [
                /*
                 * An empty list is a normal answer, not an error. The website
                 * falls back to its own designed slides, so the hero is never
                 * blank — which is what lets this ship before the client has
                 * supplied artwork.
                 */
                'hero_slides' => PublicHeroSlideResource::collection($this->slides->live()),
                'community' => new PublicCommunityResource($this->settings->current()),
                // Empty hides the section rather than drawing an empty carousel.
                'team' => PublicTeamMemberResource::collection($this->team->live()),
            ],
        ]);
    }
}
