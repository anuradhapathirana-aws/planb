import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react';

import { BannerLink } from '@/features/portal/components/BannerLink';
import type { StudentHomeBanner } from '@shared/types/homeBanner';

/**
 * The admin's Home slides — the same ones the app's carousel shows — as a
 * swipeable strip on the desktop Home. Native scroll-snap: the browser supplies
 * touch, trackpad and keyboard scrolling, and there is nothing to autoplay while
 * someone reads. (A phone gets `HomeBannerCarousel`, the app's carousel.)
 *
 * Renders nothing when no slide is live: an empty "From Plan B" box on the
 * page a student opens most is noise, not information.
 */
export function AnnouncementsStrip({ banners }: { banners: StudentHomeBanner[] }) {
  const { t } = useTranslation();

  if (banners.length === 0) return null;

  return (
    <section aria-label={t('site.portal.home.bannerLabel')}>
      <h2 className="mb-2 text-base font-semibold text-foreground">{t('site.portal.home.announcements')}</h2>

      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 md:mx-0 md:px-0">
        {banners.map((banner, index) => (
          // No id on the student Resource; the list is replaced whole on refetch.
          <li key={`${index}-${banner.title ?? ''}`} className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.375rem)] lg:w-full">
            <BannerLink link={banner.link}>
              <BannerBody banner={banner} />
            </BannerLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BannerBody({ banner }: { banner: StudentHomeBanner }) {
  return (
    <div className="relative aspect-[64/27] overflow-hidden rounded-xl bg-surface">
      {banner.image_url ? (
        <img src={banner.image_url} alt={banner.title ?? ''} className="size-full object-cover" loading="lazy" />
      ) : (
        /* Wording without artwork yet — a branded card rather than an empty box. */
        <div className="flex size-full flex-col justify-center gap-1 p-5">
          <Megaphone className="size-5 text-accent" aria-hidden="true" />
          {banner.title ? <p className="line-clamp-2 font-semibold text-white">{banner.title}</p> : null}
          {banner.subtitle ? <p className="line-clamp-2 text-sm text-surface-muted">{banner.subtitle}</p> : null}
        </div>
      )}
    </div>
  );
}
