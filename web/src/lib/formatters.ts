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

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${paddedSecs}`
    : `${minutes}:${paddedSecs}`;
}

/**
 * Plain-text excerpt of admin-authored HTML, for collapsed cards and list rows.
 * Rendering the markup there would need `dangerouslySetInnerHTML` + DOMPurify
 * (CLAUDE.md §7.6) for no real benefit — a one-line preview wants text anyway.
 *
 * `DOMParser` neither executes scripts nor loads resources, so the untrusted
 * markup is never live in the document.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
