/**
 * The LKR/AED rate behind the student Home converter.
 *
 * **Display only.** This never prices anything. A course costs what the server
 * says it costs, read from the product, and an amount in a request body is
 * never trusted (root CLAUDE.md, Payments). A converted figure is a student
 * working out what a number means to them — it must never reach an order, a
 * payment, or any request body.
 *
 * `rate` is a plain number rather than integer smallest-units, and that is not
 * an oversight: §4.11 governs *money*, and a rate is a ratio. Rounding one to
 * whole cents would make it wrong. Nothing converted with it is persisted.
 *
 * Mirrors `backend/app/Http/Resources/Student/StudentExchangeRateResource.php`.
 */
export interface StudentExchangeRate {
  /** The currency being priced — one unit of this costs `rate` of `quote`. */
  base: string;
  quote: string;
  /** `1 base = rate quote`. */
  rate: number;
  /** ISO 8601. Always shown beside the figure — an undated rate reads as today's. */
  fetched_at: string;
  /**
   * Older than the server's freshness window. Still worth showing — a day-old
   * rate answers the question — but the app has to say so.
   */
  is_stale: boolean;
}
