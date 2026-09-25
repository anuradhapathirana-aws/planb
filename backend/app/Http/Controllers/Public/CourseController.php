<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ListPublicCoursesRequest;
use App\Http\Resources\Public\PublicCourseSummaryResource;
use App\Services\Course\PublicCourseService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The public course catalogue — `GET api/v1/public/courses`.
 *
 * Read-only and anonymous. Feeds the home page's "Our Programmes" carousel now
 * and the `/courses` catalogue page when that is built, which is why it is
 * paginated and filterable from the start rather than a fixed "featured" list
 * that would have to be replaced.
 *
 * There is no authorization check and that is correct: this is a shop window.
 * Visibility lives in {@see PublicCourseService::list} as a query scope, so a
 * draft or a course in a switched-off category cannot appear whatever is asked
 * for — the same "scope is the authorization" arrangement as the student course
 * routes (`backend/CLAUDE.md` §2).
 */
class CourseController extends Controller
{
    public function __construct(private readonly PublicCourseService $courses) {}

    public function index(ListPublicCoursesRequest $request): AnonymousResourceCollection
    {
        return PublicCourseSummaryResource::collection(
            $this->courses->list($request->filters()),
        );
    }
}
