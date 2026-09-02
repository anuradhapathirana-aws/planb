<?php

declare(strict_types=1);

namespace App\Services\Service;

use App\Enums\ServiceStatus;
use App\Models\Service;
use App\Support\HtmlSanitizer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Intervention\Image\ImageManager;

/**
 * Authoring and pricing the service catalogue (the admin side).
 *
 * Named for what it manages rather than for its model, because
 * `App\Services\Service\ServiceService` would read as a typo.
 * {@see ServicePurchaseService} owns the other half: what happens after someone
 * buys one.
 */
class ServiceCatalogService
{
    /** Matches the course thumbnails, so catalogue art shares one aspect ratio. */
    private const THUMBNAIL_WIDTH = 1280;

    private const THUMBNAIL_HEIGHT = 720;

    /**
     * @param  array{search?: string, status?: string, sort?: string, direction?: string, per_page?: int}  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = Service::query()
            ->with('media')
            ->withCount([
                'purchases',
                // Drives the "N waiting" hint on the list, without a second query per row.
                'purchases as open_purchases_count' => fn ($purchases) => $purchases
                    ->whereIn('status', ServicePurchaseService::openStatuses()),
            ]);

        if (! empty($filters['search'])) {
            // `%` and `_` are LIKE wildcards; typed into a search box they are
            // literals, and an unescaped `%` would match the whole catalogue.
            $query->where('name', 'like', '%'.addcslashes($filters['search'], '%_\\').'%');
        }

        if (in_array($filters['status'] ?? null, ServiceStatus::values(), true)) {
            $query->where('status', $filters['status']);
        }

        $sortable = ['name', 'sort_order', 'price_cents', 'created_at'];
        $sort = in_array($filters['sort'] ?? null, $sortable, true) ? $filters['sort'] : 'sort_order';
        $direction = ($filters['direction'] ?? null) === 'desc' ? 'desc' : 'asc';

        return $query->orderBy($sort, $direction)
            ->orderBy('name')
            ->paginate($this->perPage($filters['per_page'] ?? null))
            ->withQueryString();
    }

    /** @param  array<string, mixed>  $data */
    public function create(array $data): Service
    {
        $service = Service::create($this->attributes($data) + [
            'sort_order' => $data['sort_order'] ?? $this->nextSortOrder(),
        ]);

        return $this->loadDetail($service);
    }

    /** @param  array<string, mixed>  $data */
    public function update(Service $service, array $data): Service
    {
        $service->update($this->attributes($data));

        return $this->loadDetail($service->fresh());
    }

    /**
     * Rich text is sanitized here, on write, before it reaches the database
     * (root CLAUDE.md §8) — never on render, where one forgetful template ships
     * an admin's paste straight into a student's app.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        return [
            'name' => $data['name'],
            'summary' => $data['summary'] ?? null,
            'description' => HtmlSanitizer::clean($data['description'] ?? null),
            'price_cents' => $data['price_cents'],
            'currency' => $data['currency'] ?? config('payments.currency'),
            'delivery_time' => $data['delivery_time'] ?? null,
            'status' => $data['status'] ?? ServiceStatus::Draft->value,
        ];
    }

    public function publish(Service $service): Service
    {
        $service->update(['status' => ServiceStatus::Published]);

        return $this->loadDetail($service);
    }

    public function unpublish(Service $service): Service
    {
        $service->update(['status' => ServiceStatus::Draft]);

        return $this->loadDetail($service);
    }

    /**
     * Soft delete, matching courses and students: a mistaken removal stays
     * recoverable, and purchases already made keep pointing at a real row rather
     * than becoming orphans in the delivery queue.
     */
    public function delete(Service $service): void
    {
        $service->delete();
    }

    /**
     * Re-encodes before storage (root CLAUDE.md §7.4), so no admin-supplied
     * bytes are ever served back as received — and a 6 MB phone photo does not
     * become part of every student's catalogue load.
     */
    public function updateThumbnail(Service $service, UploadedFile $file): Service
    {
        $encoded = ImageManager::gd()
            ->read($file->getRealPath())
            ->cover(self::THUMBNAIL_WIDTH, self::THUMBNAIL_HEIGHT)
            ->toJpeg(82);

        $tempPath = tempnam(sys_get_temp_dir(), 'planb_service_thumb_').'.jpg';
        file_put_contents($tempPath, (string) $encoded);

        $service->addMedia($tempPath)
            ->usingFileName('service-'.$service->id.'-thumb.jpg')
            ->toMediaCollection(Service::THUMBNAIL_COLLECTION);

        return $this->loadDetail($service->fresh());
    }

    public function removeThumbnail(Service $service): Service
    {
        $service->clearMediaCollection(Service::THUMBNAIL_COLLECTION);

        return $this->loadDetail($service->fresh());
    }

    public function loadDetail(Service $service): Service
    {
        return $service->load('media')->loadCount([
            'purchases',
            'purchases as open_purchases_count' => fn ($purchases) => $purchases
                ->whereIn('status', ServicePurchaseService::openStatuses()),
        ]);
    }

    /** Bounded so `per_page=100000` cannot be used to pull the whole table. */
    private function perPage(mixed $requested): int
    {
        return min(max((int) ($requested ?: 15), 1), 100);
    }

    private function nextSortOrder(): int
    {
        return (int) Service::max('sort_order') + 1;
    }
}
