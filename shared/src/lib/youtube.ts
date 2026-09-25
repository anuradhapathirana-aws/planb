/**
 * Parsing a pasted YouTube link.
 *
 * **Shared, not duplicated**, because two clients need it for two different
 * reasons and they must not drift: `site/` uses it to decide what reaches an
 * `<iframe src>`, and the admin panel uses it to tell an admin whether the link
 * they just pasted will play before they save it. A second copy would let one
 * accept a link the other rejects.
 *
 * `backend/app/Support/YouTube.php` is a third implementation of the same two
 * rules, and it is the one that actually enforces them — a check in a browser
 * bundle protects the visitor, never the database (root CLAUDE.md §7.3). All
 * three are kept in step deliberately; changing one means changing all three.
 */

/** A YouTube video id is exactly 11 characters of URL-safe base64. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Hosts we accept a link from. Compared exactly — see below. */
const HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'youtu.be']);

/**
 * Pulls the video id out of whatever YouTube URL an admin pasted, or returns
 * `null` if it is not a YouTube link at all.
 *
 * **This function is a security boundary, not a convenience.** Its result is
 * interpolated into an `<iframe src>`, so admin input reaches an origin the
 * browser will execute. Two things keep that safe and both must stay:
 *
 *  1. **The hostname is compared against an exact set, never with `includes`.**
 *     `url.includes('youtube.com')` accepts `https://evil-youtube.com.attacker.net`
 *     and `https://attacker.net/?x=youtube.com`. Parsing the URL and matching
 *     `hostname` exactly is the only version of this check that works.
 *  2. **Whatever comes out is re-tested against `VIDEO_ID` before it is
 *     returned.** Even if the parsing above were wrong, only 11 characters from
 *     `[A-Za-z0-9_-]` can ever leave this function — nothing that could close
 *     the attribute, add a query parameter, or traverse to another path.
 *
 * Never loosen either one to support a new link format. Add the format to the
 * `switch` instead.
 */
export function youTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;

  let parsed: URL;

  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  // An admin pasting `javascript:` or `data:` gets nothing.
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  if (!HOSTS.has(host)) return null;

  const path = parsed.pathname;
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = path.slice(1);
  } else if (path === '/watch') {
    id = parsed.searchParams.get('v');
  } else if (path.startsWith('/embed/')) {
    id = path.slice('/embed/'.length);
  } else if (path.startsWith('/shorts/')) {
    id = path.slice('/shorts/'.length);
  } else if (path.startsWith('/live/')) {
    id = path.slice('/live/'.length);
  }

  // Trailing segments, e.g. `/embed/ID/something`.
  id = id?.split('/')[0] ?? null;

  return id && VIDEO_ID.test(id) ? id : null;
}

/**
 * The embed URL, on the **`youtube-nocookie.com`** domain.
 *
 * That domain is YouTube's privacy-enhanced mode: it does not write tracking
 * cookies until the visitor actually plays something. Combined with the facade
 * in `YouTubeFacade` — which does not load this iframe at all until it is
 * clicked — a visitor who never presses play is never handed to Google.
 *
 * `autoplay=1` is safe here precisely because the iframe is only ever created
 * in response to a click, so the browser's gesture requirement is satisfied.
 */
export function youTubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    // Related videos at the end come from this channel only, not the whole of
    // YouTube — a testimonial should not end on a competitor's advert.
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * YouTube's own thumbnail, used when the admin has not uploaded a poster.
 *
 * `i.ytimg.com` is Google's **cookieless** static host — it is why thumbnails
 * are not served from `youtube.com`. Requesting one reveals the visitor's IP to
 * Google but sets no cookie and runs no script, which is a materially different
 * thing from loading the player. An admin-uploaded poster avoids even that, and
 * looks better besides, so it wins whenever it exists.
 *
 * `hqdefault` rather than `maxresdefault`: the max-res file only exists for
 * videos uploaded above 720p, and when it is missing YouTube serves a grey
 * 120×90 placeholder instead of a 404 — so the fallback silently looks broken.
 * `hqdefault` always exists.
 */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
