<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The service detail screen: the summary row plus the long description.
 *
 * @mixin Service
 */
class StudentServiceDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return (new StudentServiceSummaryResource($this->resource))->toArray($request) + [
            // Sanitized when the admin saved it. The mobile app renders it
            // through its own allowlist parser; a web client needs DOMPurify
            // (root CLAUDE.md §7.6).
            'description' => $this->description,

            /*
             * This student's own most recent purchase, or null. It is what the
             * app draws its delivery tracker from, so the detail screen needs no
             * second request. Scoped to the caller in
             * `StudentServiceCatalogService`, never to "the latest purchase".
             */
            'latest_purchase' => $this->whenLoaded(
                'latestPurchase',
                fn () => $this->latestPurchase
                    ? new StudentServicePurchaseResource($this->latestPurchase)
                    : null,
            ),
        ];
    }
}
