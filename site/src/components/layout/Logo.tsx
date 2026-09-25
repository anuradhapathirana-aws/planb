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
export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  const { t } = useTranslation();

  return (
    <Link
      to={paths.home}
      onClick={onClick}
      className={cn('flex shrink-0 items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring/50', className)}
    >
      <img
        src="/logo.png"
        alt={t('common.appName')}
        className="h-9 w-auto sm:h-10"
        width={40}
        height={40}
        // The mark is decorative weight, not content — never delay first paint.
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}
