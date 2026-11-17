import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Info, Package } from 'lucide-react';

import { paths } from '@/routes/paths';

/**
 * Heads a category's list when that category is sold as a bundle — the app's
 * `BundleBanner`. Read off the course rows already loaded, so it costs no
 * request. Opens the bundle's page, the one place a bundle is bought.
 */
export function BundleBanner({ categoryId, name }: { categoryId: number; name: string }) {
  const { t } = useTranslation();

  return (
    <Link
      to={paths.app.category(categoryId)}
      className="flex min-h-14 items-center gap-3 rounded-xl border border-primary/15 bg-primary-soft px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-80"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card">
        <Package className="size-[18px] text-primary" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-5 text-primary">
          {t('bundle.bannerTitle', { name })}
        </span>
        <span className="line-clamp-2 text-[12px] leading-[18px] text-muted-foreground">{t('bundle.bannerBody')}</span>
      </span>
      <ChevronRight className="size-[18px] shrink-0 text-primary" aria-hidden="true" />
    </Link>
  );
}

/** Says what the "Course 1, Course 2…" tags mean once a category is applied. */
export function CourseOrderHint() {
  const { t } = useTranslation();

  return (
    <p className="flex items-start gap-2 rounded-lg bg-primary-soft px-3 py-2 text-[12px] leading-5 text-primary">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      {t('courses.orderHint')}
    </p>
  );
}
