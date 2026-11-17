import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { SECTION_TITLE } from '@/features/portal/components/home/homeLayout';

interface HomeSectionProps {
  title: string;
  /** Where "View all" goes; omit to hide it. */
  viewAllTo?: string;
  children: ReactNode;
}

/** A titled Home block with an optional quiet "View all" link, as in the app. */
export function HomeSection({ title, viewAllTo, children }: HomeSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className={SECTION_TITLE}>{title}</h2>

        {viewAllTo !== undefined ? (
          // Small and grey at the client's request; padded to a 44px target.
          <Link
            to={viewAllTo}
            className="-my-3 -mr-2 flex min-h-11 items-center px-2 text-[11px] leading-[18px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-60"
          >
            {t('home.viewAll')}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}
