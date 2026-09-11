<?php

declare(strict_types=1);

namespace App\Http\Resources\Student;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The rate as the app renders it.
 *
 * Wraps a plain array rather than a model - there is no table behind this, the
 * rate lives in the cache - but it still goes through a Resource, because
 * nothing reaches a client except through one (root CLAUDE.md §4.4) and the
 * shape is then as reviewable as every other payload.
 *
 * `fetched_at` and `is_stale` are not decoration. A converter that shows a
 * number with no age invites a student to treat it as today's bank rate, and
 * the mid-market figure this carries is not what an exchange house will give
 * them - the spread is a few percent. The app is expected to show both.
 *
 * @property array{base: string, quote: string, rate: float, fetched_at: string, is_stale: bool} $resource
 */
class StudentExchangeRateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'base' => $this->resource['base'],
            'quote' => $this->resource['quote'],
            // One unit of `base` in `quote`. A float on purpose - see the note
            // on ExchangeRateService about why §4.11 does not apply to a ratio.
            'rate' => $this->resource['rate'],
            'fetched_at' => $this->resource['fetched_at'],
            'is_stale' => $this->resource['is_stale'],
        ];
    }
}
