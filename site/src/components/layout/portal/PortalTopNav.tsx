import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { portalNav } from '@/components/layout/siteNav';
import { useActivePortalTab } from '@/components/layout/portal/useActivePortalTab';
import { cn } from '@/lib/utils';

/** The portal's tabs as a top nav, from `md` up. `PortalTabBar` is the phone's. */
export function PortalTopNav() {
  const { t } = useTranslation();
  const active = useActivePortalTab();

  return (
    <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label={t('site.portal.title')}>
      {portalNav.map(({ labelKey, to, icon: Icon }, index) => (
        <Link
          key={to}
          to={to}
          aria-current={index === active ? 'page' : undefined}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            index === active
              ? 'bg-surface text-white'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
