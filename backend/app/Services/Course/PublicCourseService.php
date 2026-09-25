<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\CourseStatus;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

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

    /** `price` values the catalogue page's Free / Paid filter may send. */
    public const PRICE_FILTERS = ['free', 'paid'];

    /**
     * `sort` values. `recommended` is the admin's course order and the default.
     * Each maps to a fixed ORDER BY in {@see applySort()}; nothing from the
     * request is ever used as a column name.
     */
    public const SORTS = ['recommended', 'newest', 'price_asc', 'price_desc'];

    /**
     * Published courses, in the admin's order unless another sort is asked for.
     *
     * @param  array{search?: string|null, category_id?: int|null, price?: string|null, sort?: string|null, per_page?: int|null}  $filters
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

        /*
         * "Free" is a price of zero, the same test `CourseProgramme::isFree()`
         * makes. A paid course sold only inside a bundle is still "paid" — its
         * card says "In a bundle" rather than a price, but it is not free.
         */
        match ($filters['price'] ?? null) {
            'free' => $query->where('price_cents', 0),
            'paid' => $query->where('price_cents', '>', 0),
            default => null,
        };

        $this->applySort($query, $filters['sort'] ?? null);

        $perPage = min((int) ($filters['per_page'] ?? 12), self::MAX_PER_PAGE);

        return $query
            ->paginate(max($perPage, 1))
            ->withQueryString();
    }

    /**
     * One course for its public page, or a 404 — for a draft, a deleted course,
     * a course in a switched-off category, and an id that never existed alike.
     * One answer for all four, so a stranger cannot tell a hidden course from
     * a missing one.
     *
     * The syllabus is titles and durations only: which lessons exist and how
     * long they run. Nothing that locates a video file is loaded, let alone sent.
     *
     * A fixed 404 message rather than `findOrFail()`'s: Laravel keeps an HTTP
     * exception's message even with debug off, and that one names the model
     * class — an internal detail a public endpoint has no reason to publish.
     *
     * @throws NotFoundHttpException
     */
    public function find(int $id): CourseProgramme
    {
        $course = $this->summaryQuery()
            // The summary loads the first three topics for cards; the page wants all of them.
            ->without('topics')
            ->with([
                'topics' => fn ($topics) => $topics
                    ->select(['id', 'course_programme_id', 'title', 'title_si', 'sort_order'])
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->with(['videos' => fn ($videos) => $videos
                        ->select(['id', 'course_topic_id', 'title', 'title_si', 'duration_seconds', 'sort_order'])
                        ->orderBy('sort_order')
                        ->orderBy('id')]),
                'paper' => fn ($paper) => $paper->withCount('questions'),
                'category.parent',
            ])
            ->find($id);

        if ($course === null) {
            throw new NotFoundHttpException('Course not found.');
        }

        return $course;
    }

    /**
     * One category's public page — in practice a course bundle's.
     *
     * Visible categories only; anything else is one fixed 404, like a course.
     * Sets on the model, for `PublicCategoryDetailResource`:
     *
     *  - `public_courses` — the courses a visitor sees here: for a bundle that
     *    is this category's own, exactly the bundle's courses
     *    ({@see CourseCategory::bundleCategoryIds()}), so the list is what the
     *    button buys; otherwise this category and its sub-categories.
     *  - `bundle_owner` — the category whose bundle these courses are sold in
     *    (itself, its main category, or null when sold one by one). The page
     *    redirects to the owner's page when it is not this one, so a bundle is
     *    only ever bought from the page listing its contents.
     *  - `public_children` — visible sub-categories holding a visible course,
     *    each flagged `own_bundle` when it is sold as a separate bundle (and so
     *    is linked to rather than listed).
     *
     * @throws NotFoundHttpException
     */
    public function category(int $id): CourseCategory
    {
        $category = CourseCategory::query()
            ->visibleToStudents()
            ->with(['parent', 'children' => fn ($children) => $children
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')])
            ->find($id);

        if ($category === null) {
            throw new NotFoundHttpException('Category not found.');
        }

        $owner = $category->bundleOwner();
        $categoryIds = $owner?->is($category) === true
            ? $category->bundleCategoryIds()
            : $category->selfAndChildIds();

        $courses = $this->summaryQuery()
            ->whereIn('course_category_id', $categoryIds)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $counts = $this->visibleCourses()
            ->toBase()
            ->whereIn('course_category_id', $category->selfAndChildIds())
            ->selectRaw('course_category_id, COUNT(*) as aggregate')
            ->groupBy('course_category_id')
            ->pluck('aggregate', 'course_category_id');

        $children = $category->children
            ->each(function (CourseCategory $child) use ($counts): void {
                $child->setAttribute('courses_count', (int) ($counts[$child->id] ?? 0));
                /*
                 * Sold as a bundle of its own. A child that follows this page's
                 * bundle has the main category as its owner, never itself, so
                 * this alone is enough — and stays right on a page that sells
                 * no bundle at all.
                 */
                $child->setAttribute('own_bundle', $child->bundleOwner()?->is($child) === true);
            })
            ->filter(fn (CourseCategory $child) => $child->getAttribute('courses_count') > 0)
            ->values();

        $category->setAttribute('public_courses', $courses);
        $category->setAttribute('bundle_owner', $owner);
        $category->setAttribute('public_children', $children);

        return $category;
    }

    /**
     * The categories the catalogue page filters by: visible top-level
     * categories in admin order, each with its visible sub-categories, and
     * **only those with at least one course a visitor can actually see** — a
     * filter chip that always answers "no courses" reads as a broken page.
     *
     * Counted with the same visibility rule {@see summaryQuery()} applies, so a
     * chip's count and the list it opens can never disagree. A count of
     * published courses is catalogue data, not PII.
     *
     * @return Collection<int, CourseCategory> each with `courses_count` set, and
     *                                         `children` filtered the same way
     */
    public function categories(): Collection
    {
        /** @var array<int, int> $perCategory visible course count, keyed by category id */
        $perCategory = $this->visibleCourses()
            ->toBase()
            ->selectRaw('course_category_id, COUNT(*) as aggregate')
            ->groupBy('course_category_id')
            ->pluck('aggregate', 'course_category_id')
            ->map(fn ($count) => (int) $count)
            ->all();

        $parents = CourseCategory::query()
            ->visibleToStudents()
            ->whereNull('parent_id')
            ->with(['children' => fn ($children) => $children
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return $parents
            ->map(function (CourseCategory $parent) use ($perCategory): CourseCategory {
                $children = $parent->children
                    ->each(fn (CourseCategory $child) => $child->setAttribute(
                        'courses_count',
                        $perCategory[$child->id] ?? 0,
                    ))
                    ->filter(fn (CourseCategory $child) => $child->getAttribute('courses_count') > 0)
                    ->values();

                $parent->setRelation('children', $children);
                $parent->setAttribute(
                    'courses_count',
                    ($perCategory[$parent->id] ?? 0) + (int) $children->sum('courses_count'),
                );

                return $parent;
            })
            ->filter(fn (CourseCategory $parent) => $parent->getAttribute('courses_count') > 0)
            ->values();
    }

    /**
     * Every branch ends on `id`, so the order is total: without a unique
     * tie-breaker, two courses at the same price can swap between page 1 and
     * page 2, and a visitor paging through sees one twice and the other never.
     *
     * @param  Builder<CourseProgramme>  $query
     */
    private function applySort(Builder $query, ?string $sort): void
    {
        match ($sort) {
            'newest' => $query->orderByDesc('published_at')->orderByDesc('id'),
            'price_asc' => $query->orderBy('price_cents')->orderBy('id'),
            'price_desc' => $query->orderByDesc('price_cents')->orderBy('id'),
            /*
             * The default: the order the admin set within each category, then
             * the category itself, then id. Not `published_at desc`: Plan B's
             * courses are a sequence a student works through ("Course 1, Course
             * 2…"), and newest-first would present step four before step one.
             */
            default => $query->orderBy('course_category_id')->orderBy('sort_order')->orderBy('id'),
        };
    }

    /**
     * @return Builder<CourseProgramme>
     */
    private function summaryQuery(): Builder
    {
        return $this->visibleCourses()
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
     * What a visitor may see, and nothing else — the one definition both the
     * list and the category counts are built on, so they cannot drift apart.
     * Soft-deleted courses are excluded by the model's own scope.
     *
     * @return Builder<CourseProgramme>
     */
    private function visibleCourses(): Builder
    {
        return CourseProgramme::query()
            ->where('status', CourseStatus::Published)
            // Absolute for a visitor — see the class docblock.
            ->whereHas('category', fn (Builder $category) => $category->visibleToStudents());
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
