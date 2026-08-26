import axios from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

interface LaravelValidationBody {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Pulls Laravel's per-field messages out of a 422 response, or null for any
 * other failure (network, 500, 403 …) which the caller should report generically.
 */
export function getValidationErrors(error: unknown): Record<string, string[]> | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) return null;
  const errors = (error.response.data as LaravelValidationBody | undefined)?.errors;
  return errors && Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Maps a 422 onto react-hook-form field errors so backend-only rules (unique
 * email, unique student ID …) surface under the offending input instead of in
 * a toast that doesn't say which field is wrong.
 *
 * `knownFields` guards against setting an error on a name the form doesn't
 * render — RHF would hold that error forever and block resubmit with nothing
 * on screen to explain why. Anything unmatched comes back for the caller to
 * show some other way.
 *
 * `options.nested` opts into setting the error on the full dotted path instead
 * of the root — only safe when the form renders every level of that path.
 */
export function applyServerValidationErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
  options: { nested?: boolean } = {},
): { applied: number; unmatched: string[] } {
  const errors = getValidationErrors(error);
  if (!errors) return { applied: 0, unmatched: [] };

  const known = new Set(knownFields);
  const unmatched: string[] = [];
  let applied = 0;

  for (const [field, messages] of Object.entries(errors)) {
    const message = messages?.[0];
    if (!message) continue;

    // Laravel reports nested/array members as "languages_spoken.0" — anchor to the root field.
    // `split` always yields at least one element, but the fallback keeps this
    // honest under `noUncheckedIndexedAccess` (which mobile/ enables) instead of
    // asserting the compiler is wrong.
    const root = field.split('.')[0] ?? field;

    if (known.has(root)) {
      // Forms that actually render the nested rows (e.g. the Course form's
      // topics[].videos[]) want the error on the exact row; flat forms anchor to
      // the root so an error can't land on an input that isn't on screen.
      const target = options.nested ? field : root;
      setError(target as Path<T>, { type: 'server', message }, { shouldFocus: applied === 0 });
      applied += 1;
    } else {
      unmatched.push(message);
    }
  }

  return { applied, unmatched };
}
