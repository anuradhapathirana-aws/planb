import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';

/*
 * The bundled logo, not the one from `app-config`.
 *
 * The header renders before any request finishes, and a logo that pops in a
 * second late is the first thing a visitor sees go wrong. The admin-uploaded
 * logo drives the mobile app's splash, where there IS a loading gate to hang it
 * on; here the brand mark is part of the shell.
 */

/**
 * `md` is the portal header and the site footer; `lg` is the public header.
 *
 * Height only — the width is always `auto`, because the mark is not square and a
 * fixed width would squash it. The `width`/`height` attributes on the `<img>`
 * exist to reserve space against layout shift, not to size it.
 */
const SIZES = {
  md: 'h-9 sm:h-10',
  lg: 'h-12 sm:h-14',
} as const;

/**
 * **The mark needs no plate or backing on a dark band, and must not be given
 * one.** `logo.png` is a circular badge that carries its own cream field and
 * gold ring, on a transparent background — so it reads on navy exactly as it
 * reads on white. A white panel behind it draws a rectangle around a round
 * badge, which is what it looked like when the header first went navy
 * (removed at the client's request, 2026-09-25).
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
        src="/logo.png"
        alt={t('common.appName')}
        className={cn('w-auto', SIZES[size])}
        width={56}
        height={56}
        // The mark is decorative weight, not content — never delay first paint.
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}
