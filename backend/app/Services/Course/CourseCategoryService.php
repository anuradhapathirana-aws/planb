<?php

declare(strict_types=1);

namespace App\Services\Course;

use App\Enums\OrderStatus;
use App\Models\CourseCategory;
use App\Models\CourseProgramme;
use App\Models\Enrolment;
use App\Models\Order;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Intervention\Image\ImageManager;

class CourseCategoryService
{
    public function __construct(private readonly CourseProgrammeService $programmes) {}

    /**
     * Top-level categories, paginated, each with its sub-categories nested.
     *
     * Pagination counts parents only, so a parent and its children never split
     * across two pages. With a filter applied, a parent is listed when it OR any
     * of its children matches; a matching parent shows all its children, a
     * parent listed only because of a child shows just the matching children.
     *
     * @param  array{search?: string, is_active?: string, sort?: string, direction?: string, per_page?: int}  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $active = match ($filters['is_active'] ?? null) {
            '1' => true,
            '0' => false,
            default => null,
        };

        $matches = function (Builder $query) use ($search, $active): void {
            if ($search !== '') {
                $term = '%'.addcslashes($search, '%_\\').'%';
                $query->where(fn (Builder $inner) => $inner
                    ->where('name', 'like', $term)
                    ->orWhere('name_si', 'like', $term));
            }

            if ($active !== null) {
                $query->where('is_active', $active);
            }
        };

        $query = CourseCategory::query()
            ->whereNull('parent_id')
            ->withCount('programmes')
            ->with([
                'media',
                'children' => fn ($children) => $children->withCount('programmes')->with('media'),
            ]);

        if ($search !== '' || $active !== null) {
            $query->where(fn (Builder $inner) => $inner
                ->where($matches)
                ->orWhereHas('children', $matches));
        }

        $sortable = ['name', 'sort_order', 'created_at'];
        $sort = in_array($filters['sort'] ?? null, $sortable, true) ? $filters['sort'] : 'sort_order';
        $direction = ($filters['direction'] ?? null) === 'desc' ? 'desc' : 'asc';

        $paginated = $query->orderBy($sort, $direction)
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 25)
            ->withQueryString();

        if ($search !== '' || $active !== null) {
            foreach ($paginated->getCollection() as $parent) {
                if (! $this->matchesInMemory($parent, $search, $active)) {
                    $parent->setRelation('children', $parent->children
                        ->filter(fn (CourseCategory $child) => $this->matchesInMemory($child, $search, $active))
                        ->values());
                }
            }
        }

        return $paginated;
    }

    /**
     * The categories a student can browse, as a tree: every VISIBLE top-level
     * category in admin order, each with its active sub-categories.
     *
     * Home's "Top Categories" row draws the parents; the course filter sheet
     * draws the children under the parent a student picks. One response serves
     * both, and it is small — a few dozen rows at most.
     *
     * Empty categories are included on purpose — the admin decides what is on
     * the row by switching a category on or off, not by whether a course happens
     * to be published in it today.
     *
     * @return Collection<int, CourseCategory>
     */
    public function visibleTreeForStudents(): Collection
    {
        return CourseCategory::query()
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->with([
                'media',
                'children' => fn ($children) => $children->where('is_active', true)->with('media'),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    /** @param  array<string, mixed>  $data */
    public function create(array $data): CourseCategory
    {
        $data['parent_id'] = isset($data['parent_id']) ? (int) $data['parent_id'] : null;
        $data['sort_order'] ??= $this->nextSortOrder($data['parent_id']);

        return $this->loadForAdmin(CourseCategory::create($data));
    }

    /** @param  array<string, mixed>  $data */
    public function update(CourseCategory $category, array $data): CourseCategory
    {
        $newParentId = array_key_exists('parent_id', $data)
            ? (isset($data['parent_id']) ? (int) $data['parent_id'] : null)
            : $category->parent_id;
        $data['parent_id'] = $newParentId;

        // Moved to another level: go to the end of the new sibling list rather
        // than keep a position number that meant something somewhere else.
        if ($newParentId !== $category->parent_id) {
            $data['sort_order'] = $this->nextSortOrder($newParentId);
        }

        $category->update($data);

        // Uploaded icons are a sub-category feature; a category promoted to the
        // top level drops its image and falls back to the fixed icon list.
        if ($category->parent_id === null) {
            $category->clearMediaCollection(CourseCategory::ICON_IMAGE_COLLECTION);
        }

        return $this->loadForAdmin($category->fresh());
    }

    /**
     * Switching a parent off hides its whole branch from students — its
     * sub-categories and every course in them — without touching the children's
     * own switches, so switching it back on restores exactly what was there.
     *
     * Students already enrolled keep their courses (see StudentCourseService).
     */
    public function activate(CourseCategory $category): CourseCategory
    {
        $category->update(['is_active' => true]);

        return $this->loadForAdmin($category);
    }

    public function deactivate(CourseCategory $category): CourseCategory
    {
        $category->update(['is_active' => false]);

        return $this->loadForAdmin($category);
    }

    /**
     * Deletes the category, its sub-categories and every course in them.
     *
     * Everything is SOFT-deleted, and each course goes through the normal course
     * delete, so its Bunny videos are cleaned up exactly as if the admin had
     * deleted it by hand. Refused outright while any student is enrolled or
     * mid-payment — deactivating is the way to retire a category people use.
     */
    public function delete(CourseCategory $category): void
    {
        $categoryIds = $category->selfAndChildIds();

        $programmes = CourseProgramme::query()
            ->whereIn('course_category_id', $categoryIds)
            ->get();

        $this->assertSafeToDelete($programmes->modelKeys());

        DB::transaction(function () use ($category, $categoryIds, $programmes): void {
            foreach ($programmes as $programme) {
                $this->programmes->delete($programme);
            }

            CourseCategory::query()
                ->whereIn('id', $categoryIds)
                ->where('id', '!=', $category->id)
                ->get()
                ->each(fn (CourseCategory $child) => $child->delete());

            $category->delete();
        });
    }

    /**
     * A sub-category's own icon, re-encoded before storage (CLAUDE.md §7.4).
     *
     * Centre-cropped to a 256×256 square, the shape the admin's upload box
     * previews, so what they see there is what students get. Always PNG, so a
     * transparent background stays transparent on the coloured tile.
     */
    public function updateIconImage(CourseCategory $category, UploadedFile $file): CourseCategory
    {
        $encoded = ImageManager::gd()
            ->read($file->getRealPath())
            ->cover(256, 256)
            ->toPng();

        $tempPath = tempnam(sys_get_temp_dir(), 'planb_category_icon_').'.png';
        file_put_contents($tempPath, (string) $encoded);

        $category->addMedia($tempPath)
            ->usingFileName('category-'.$category->id.'-icon.png')
            ->toMediaCollection(CourseCategory::ICON_IMAGE_COLLECTION);

        return $this->loadForAdmin($category->fresh());
    }

    public function removeIconImage(CourseCategory $category): CourseCategory
    {
        $category->clearMediaCollection(CourseCategory::ICON_IMAGE_COLLECTION);

        return $this->loadForAdmin($category->fresh());
    }

    /** @param  list<int>  $programmeIds */
    private function assertSafeToDelete(array $programmeIds): void
    {
        if ($programmeIds === []) {
            return;
        }

        $enrolled = Enrolment::query()
            ->whereIn('course_programme_id', $programmeIds)
            ->distinct()
            ->count('student_id');

        if ($enrolled > 0) {
            throw ValidationException::withMessages([
                'category' => $enrolled === 1
                    ? '1 student is enrolled in a course in this category. Deactivate it instead - '
                        .'enrolled students keep their courses.'
                    : "{$enrolled} students are enrolled in courses in this category. Deactivate it instead - "
                        .'enrolled students keep their courses.',
            ]);
        }

        /*
         * An unpaid order can still settle — a card webhook or an approved bank
         * transfer — and would then enrol a student into a deleted course.
         */
        $inFlight = Order::query()
            ->where('purchasable_type', (new CourseProgramme)->getMorphClass())
            ->whereIn('purchasable_id', $programmeIds)
            ->whereIn('status', [OrderStatus::Pending, OrderStatus::AwaitingVerification])
            ->exists();

        if ($inFlight) {
            throw ValidationException::withMessages([
                'category' => 'A student is paying for a course in this category right now. '
                    .'Deactivate it instead, or try again once the payment is settled.',
            ]);
        }
    }

    private function matchesInMemory(CourseCategory $category, string $search, ?bool $active): bool
    {
        if ($active !== null && $category->is_active !== $active) {
            return false;
        }

        if ($search === '') {
            return true;
        }

        $needle = mb_strtolower($search);

        return str_contains(mb_strtolower($category->name), $needle)
            || str_contains(mb_strtolower((string) $category->name_si), $needle);
    }

    private function loadForAdmin(CourseCategory $category): CourseCategory
    {
        return $category->loadCount('programmes')->load([
            'media',
            'children' => fn ($children) => $children->withCount('programmes')->with('media'),
        ]);
    }

    /** Appends a new category to the end of its sibling list rather than the front. */
    private function nextSortOrder(?int $parentId): int
    {
        return (int) CourseCategory::query()
            ->where('parent_id', $parentId)
            ->max('sort_order') + 1;
    }
}
