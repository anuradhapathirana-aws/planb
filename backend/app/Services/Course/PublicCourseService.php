<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\CourseStatus;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * The course catalogue as an anonymous visitor sees it.
 *
 * **Its own service, not a branch inside {@see StudentCourseService}.** That one
 * takes a `Student` in every signature and joins enrolment, wishlist and
 * progress onto every row; making the student optional there would mean a null
 * check in front of each of those, and the day one is forgotten a stranger
 * receives another student's state. Nothing here has a student to forget.
 *
 * What visibility means here is narrower than for a signed-in student, and
 * deliberately so: a student still sees a course they are enrolled in after its
 * category is switched off, because they paid for it. A visitor has no such
 * claim, so the category rule is absolute.
 */
class PublicCourseService
{
    /**
     * The most a single request may return.
     *
     * The home page's carousel asks for one page of this size and treats it as
     * "every course", which is true until Plan B publishes more than 48 — at
     * which point the carousel shows the first 48 and "View all courses" carries
     * the rest. An unbounded public endpoint is not an option: this is reachable
     * by anything on the internet, and `per_page=100000` would be a free way to
     * make the server assemble the entire catalogue on demand.
     */
    public const MAX_PER_PAGE = 48;

    /**
     * Published courses, newest category order first.
     *
     * @param  array{search?: string|null, category_id?: int|null, per_page?: int|null}  $filters
     * @return LengthAwarePaginator<int, CourseProgramme>
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = $this->summaryQuery();

        $search = trim((string) ($filters['search'] ?? ''));

        if ($search !== '') {
            $this->applySearch($query, $search);
        }

        if (($filters['category_id'] ?? null) !== null) {
            /*
             * A parent category means "this and everything under it" — the same
             * meaning the student app gives it, so a visitor filtering by
             * "Migration" is not shown an empty list because every course sits
             * on a sub-category.
             */
            $category = CourseCategory::query()->find($filters['category_id']);

            $query->whereIn(
                'course_category_id',
                $category === null ? [$filters['category_id']] : $category->selfAndChildIds(),
            );
        }

        $perPage = min((int) ($filters['per_page'] ?? 12), self::MAX_PER_PAGE);

        return $query
            /*
             * The order the admin set within each category, then the category
             * itself, then id. Not `published_at desc`: Plan B's courses are a
             * sequence a student works through ("Course 1, Course 2…"), and
             * showing them newest-first would present step four before step one.
             */
            ->orderBy('course_category_id')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate(max($perPage, 1))
            ->withQueryString();
    }

    /**
     * @return Builder<CourseProgramme>
     */
    private function summaryQuery(): Builder
    {
        return CourseProgramme::query()
            ->where('status', CourseStatus::Published)
            // Absolute for a visitor — see the class docblock.
            ->whereHas('category', fn (Builder $category) => $category->visibleToStudents())
            ->withCount(['topics', 'videos'])
            /*
             * Summed in the same query rather than by loading every lesson row.
             * `duration_seconds` is nullable, so this can come back null; the
             * Resource coerces that to 0 and the card hides the chip rather
             * than showing "0m".
             */
            ->withSum('videos as total_duration_seconds', 'duration_seconds')
            ->with([
                'category.parent',
                // Avoids an N+1 when each row renders its thumbnail URL.
                'media',
                /*
                 * The first three topic titles become the card's bullet points.
                 * Limited here rather than in the Resource so the query does
                 * not drag a forty-topic course's whole outline across for
                 * three lines of text.
                 */
                'topics' => fn ($topics) => $topics
                    ->select(['id', 'course_programme_id', 'title', 'title_si', 'sort_order'])
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->limit(3),
            ]);
    }

    /**
     * Search a course by its own name OR by any of its topics' titles — the same
     * rule as the student catalogue, and for the same reason: nobody searches
     * "Course Module 3", they search "visa".
     *
     * Both scripts are searched whatever language the page is in. Most phones in
     * Sri Lanka are set to English, so a visitor reading in Sinhala very often
     * types the English word, and a course they are looking straight at must not
     * fail to come back.
     *
     * @param  Builder<CourseProgramme>  $query
     */
    private function applySearch(Builder $query, string $search): void
    {
        // Escape the LIKE wildcards themselves, or a visitor typing "100%"
        // matches every course in the catalogue.
        $term = '%'.addcslashes($search, '%_\\').'%';

        /*
         * Wrapped in one closure so the OR cannot escape the `status =
         * published` filter around it, which would leak drafts into results a
         * stranger can read.
         */
        $query->where(function (Builder $inner) use ($term): void {
            $inner->where('name', 'like', $term)
                ->orWhere('name_si', 'like', $term)
                ->orWhereHas('topics', fn (Builder $topics) => $topics
                    ->where('title', 'like', $term)
                    ->orWhere('title_si', 'like', $term));
        });
    }
}
