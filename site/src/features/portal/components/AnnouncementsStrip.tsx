import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react';

import { paths } from '@/routes/paths';
import type { StudentHomeBanner, StudentHomeBannerLink } from '@shared/types/homeBanner';

/**
 * The admin's Home slides — the same ones the app's carousel shows — as a
 * swipeable strip. Native scroll-snap: the browser supplies touch, trackpad and
 * keyboard scrolling, and there is nothing to autoplay while someone reads.
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

const linkClass =
  'block rounded-xl outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring/50';

/**
 * Where a slide goes. An exhaustive `switch` over the server's resolved link
 * union: a destination is chosen from a fixed list, never a path an admin
 * typed. `url` is the one free-text case — restricted to http/https here as
 * well as on the server, and rendered as a real external `<a>` (a router `Link`
 * given an absolute URL would navigate to `/https://…`).
 */
function BannerLink({ link, children }: { link: StudentHomeBannerLink; children: ReactNode }) {
  switch (link.type) {
    case 'none':
      return <div>{children}</div>;
    case 'courses':
      return (
        <Link to={paths.courses} className={linkClass}>
          {children}
        </Link>
      );
    case 'services':
      return (
        <Link to={paths.app.services} className={linkClass}>
          {children}
        </Link>
      );
    case 'checklists':
      return (
        <Link to={paths.app.checklist} className={linkClass}>
          {children}
        </Link>
      );
    case 'course':
      return (
        <Link to={paths.app.courseDetail(link.course_id)} className={linkClass}>
          {children}
        </Link>
      );
    case 'url':
      return isWebUrl(link.url) ? (
        <a href={link.url} target="_blank" rel="noreferrer noopener" className={linkClass}>
          {children}
        </a>
      ) : (
        <div>{children}</div>
      );
    default: {
      // A link type this build does not know yet renders unlinked, never guessed at.
      const unknown: never = link;
      void unknown;

      return <div>{children}</div>;
    }
  }
}

function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);

    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
