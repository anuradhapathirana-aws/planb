/**
 * The converter's arithmetic, shared by the mobile app and the website portal so
 * the same amount always converts to the same figure in both.
 *
 * **Display only, and that is a hard boundary.** Nothing derived from this may
 * price a course, open an order, or travel in a request body — a price comes
 * from the product, on the server (root CLAUDE.md, Payments).
 */

/** Converted amounts are currency, so two decimals. */
const DECIMALS = 2;

/**
 * Converts `amount` (as typed) with `rate` (1 base = `rate` quote). `inverted`
 * converts quote → base instead. Returns '' when the input is not a number.
 *
 * Commas and spaces are what a student types into an amount ("1,500"), so they
 * are stripped rather than refused.
 */
export function convertAmount(amount: string, rate: number, inverted: boolean): string {
  const parsed = Number.parseFloat(amount.replace(/[,\s]/g, ''));

  if (!Number.isFinite(parsed) || rate <= 0) return '';

  const result = inverted ? parsed / rate : parsed * rate;

  return result.toLocaleString(undefined, {
    minimumFractionDigits: DECIMALS,
    maximumFractionDigits: DECIMALS,
  });
}
