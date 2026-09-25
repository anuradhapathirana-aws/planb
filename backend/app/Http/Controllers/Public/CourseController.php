<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ListPublicCoursesRequest;
use App\Http\Resources\Public\PublicCategoryDetailResource;
use App\Http\Resources\Public\PublicCourseCategoryResource;
use App\Http\Resources\Public\PublicCourseDetailResource;
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

    /**
     * One course's public page. The id is a raw number rather than a bound
     * model: `Route::bind()` is global, and a published-only binder on a
     * parameter name would also hide drafts from the admin routes (see the note
     * at the top of routes/api_student.php) — and a student binder named
     * `course` already exists, which is why the route parameter is `{id}`.
     * The Service's query is the scope.
     */
    public function show(int $id): PublicCourseDetailResource
    {
        return new PublicCourseDetailResource($this->courses->find($id));
    }

    /**
     * One category's page — a course bundle's, on the website. Raw id, for the
     * same global-binder reason as {@see show()}.
     */
    public function category(int $id): PublicCategoryDetailResource
    {
        return new PublicCategoryDetailResource($this->courses->category($id));
    }

    /**
     * `GET api/v1/public/course-categories` — the catalogue page's filter.
     * Only categories with at least one visible course; see the Service.
     */
    public function categories(): AnonymousResourceCollection
    {
        return PublicCourseCategoryResource::collection($this->courses->categories());
    }
}
