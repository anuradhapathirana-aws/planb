import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSiteLogoUrl } from '@/features/marketing/siteContentQuery';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';

/** Ships with the site: the first paint, and the fallback whenever the uploaded logo is not there. */
const BUNDLED_LOGO = '/logo.png';

/**
 * The last uploaded logo that actually loaded, so a returning visitor's first
 * paint is already the right mark (the image itself comes from the browser
 * cache). A per-visitor convenience only — a blocked or empty store just means
 * the bundled mark shows until the fresh one has loaded.
 */
const REMEMBERED_KEY = 'pb.logo-url';

function rememberedLogo(): string | null {
  try {
    return localStorage.getItem(REMEMBERED_KEY);
  } catch {
    return null;
  }
}

function remember(url: string | null): void {
  try {
    if (url) localStorage.setItem(REMEMBERED_KEY, url);
    else localStorage.removeItem(REMEMBERED_KEY);
  } catch {
    // Not fatal — the next visit starts from the bundled mark instead.
  }
}

/**
 * `md` is the portal header, `lg` the public header, `xl` the site footer.
 *
 * Height only — the width is always `auto`, because the mark is not square and a
 * fixed width would squash it. The `width`/`height` attributes on the `<img>`
 * exist to reserve space against layout shift, not to size it.
 */
const SIZES = {
  md: 'h-9 sm:h-10',
  lg: 'h-12 sm:h-14',
  /** The footer: its own column with room to spare, so the mark can be read there. */
  xl: 'h-20 sm:h-24',
} as const;

/**
 * Plan B's logo: the one uploaded in the admin panel under Settings > App
 * Intro ("Plan B logo"), the same file the app's launch screen and the admin
 * sign-in page use — so changing it there changes it here.
 *
 * **It never pops in, and never leaves a gap.** The header renders before any
 * request finishes, so the first paint is the bundled `logo.png` (or the last
 * uploaded logo this browser loaded). The uploaded one replaces it only once
 * the image has fully downloaded, and anything that goes wrong — nothing
 * uploaded, the API unreachable, a broken file — leaves the bundled mark up.
 *
 * **No plate or backing behind the mark, on any band.** A white panel behind
 * the round badge drew a rectangle around it (removed at the client's request,
 * 2026-09-25). The same applies to the file itself: whatever surrounds the
 * artwork in the image is drawn on the navy header. The bundled badge's corners
 * are opaque black, which disappears into the navy; an uploaded logo on a solid
 * light square will show as a light box. **The uploaded logo should be a PNG
 * with a transparent background** — that is an asset fix, not something to
 * paper over here with blend modes, which would also tint the artwork.
 */
export function Logo({
  className,
  onClick,
  size = 'md',
}: {
  className?: string;
  onClick?: () => void;
  size?: keyof typeof SIZES;
}) {
  const { t } = useTranslation();
  const uploaded = useSiteLogoUrl();
  const [shown, setShown] = useState<string>(() => rememberedLogo() ?? BUNDLED_LOGO);

  useEffect(() => {
    // Still asking, or the API is unreachable: keep whatever is showing.
    if (uploaded === undefined) return;

    // Nothing uploaded (or it was removed): back to the bundled mark.
    const target = uploaded ?? BUNDLED_LOGO;
    if (target === shown) return;

    let cancelled = false;

    // Swap only once the new image is fully loaded, so the header never blanks.
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      remember(uploaded);
      setShown(target);
    };
    image.src = target;

    return () => {
      cancelled = true;
    };
  }, [uploaded, shown]);

  return (
    <Link
      to={paths.home}
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring/50',
        className,
      )}
    >
      <img
        src={shown}
        alt={t('common.appName')}
        className={cn('w-auto', SIZES[size])}
        width={56}
        height={56}
        // The mark is decorative weight, not content — never delay first paint.
        loading="eager"
        decoding="async"
        onError={() => {
          // A remembered logo the admin has since replaced or removed.
          if (shown === BUNDLED_LOGO) return;
          remember(null);
          setShown(BUNDLED_LOGO);
        }}
      />
    </Link>
  );
}
