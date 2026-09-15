/**
 * Just the figures of a delivery estimate — "3-5 working days" becomes "3-5".
 *
 * For the pill on a service image, where there is room for nothing more.
 * `delivery_time` is free text typed by an admin, so a value with no number in
 * it ("On request") comes back whole rather than being lost. Null for an empty
 * value, so callers can skip the pill entirely.
 */
export function shortDeliveryTime(deliveryTime: string | null | undefined): string | null {
  const value = (deliveryTime ?? '').trim();

  if (value === '') return null;

  return value.match(/\d+(?:\s*[-–]\s*\d+)?/)?.[0].replace(/\s/g, '') ?? value;
}
