/**
 * Stable client-side key for a repeatable form row, generated when the row is
 * created and kept through reorders. `useFieldArray` reserves `id` for its own
 * React key and overwrites a server id, so the server id lives in `saved_id`
 * and anything held outside the form (staged files, upload progress, collapse
 * state) is keyed by this instead.
 *
 * `crypto.randomUUID` needs a secure context; the fallback keeps dev-over-IP working.
 */
export function newClientKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
