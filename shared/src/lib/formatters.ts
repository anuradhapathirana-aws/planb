export function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-LK', options ?? { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function labelizeVisaStatus(status: 'visit' | 'employment' | null): string {
  if (!status) return 'Not set';
  return status === 'visit' ? 'Visit' : 'Employment';
}

/** "12.4 MB" — file sizes in the video list. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** "8:05" / "1:02:30" — lesson lengths. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return '—';

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const paddedSecs = String(secs).padStart(2, '0');

  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${paddedSecs}` : `${minutes}:${paddedSecs}`;
}

/**
 * "5h 15m" / "45m" — a whole course's run time, for a catalogue row.
 *
 * Distinct from `formatDuration` above, which renders a *player* position as
 * "8:05". A clock reading is right when you are scrubbing a lesson and wrong
 * when you are deciding whether a course fits into a weekend.
 *
 * Returns '' for nothing, so a course whose lessons have no durations recorded
 * renders no chip at all rather than a misleading "0m".
 */
export function formatCourseLength(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds) || seconds <= 0) return '';

  const totalMinutes = Math.round(seconds / 60);

  // Anything at all should read as at least a minute — "0m" on a real lesson
  // looks broken.
  if (totalMinutes < 1) return '1m';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * Money for display. Amounts are stored in the smallest unit as integers
 * (root CLAUDE.md §4.11), so this is the only place they become decimal —
 * nothing else should divide by 100.
 */
export function formatMoney(cents: number | null | undefined, currency = 'LKR'): string {
  if (cents == null || Number.isNaN(cents)) return '—';

  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** The inverse, for a price input: "5000.50" → 500050. */
export function toCents(amount: string | number | null | undefined): number {
  if (amount === '' || amount == null) return 0;

  const value = typeof amount === 'number' ? amount : Number.parseFloat(amount);

  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Cents → the decimal string a price input shows: 500050 → "5000.50". */
export function fromCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '';

  return (cents / 100).toFixed(2);
}
