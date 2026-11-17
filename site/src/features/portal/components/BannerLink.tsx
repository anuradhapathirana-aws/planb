import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import type { StudentHomeBannerLink } from '@shared/types/homeBanner';

/**
 * The CTA label key for a banner's destination, or null when it goes nowhere.
 * The mobile app's carousel uses the same keys.
 */
export const BANNER_CTA_KEY: Record<StudentHomeBannerLink['type'], string | null> = {
  none: null,
  courses: 'home.ctaCourses',
  services: 'home.ctaServices',
  checklists: 'home.ctaChecklists',
  course: 'home.ctaCourse',
  url: 'home.ctaMore',
};

interface BannerLinkProps {
  link: StudentHomeBannerLink;
  className?: string;
  /** Spoken name for the whole slide, since the slide is the link. */
  label?: string;
  children: ReactNode;
}

/**
 * Wraps a Home banner in wherever the admin pointed it. The destination comes
 * from a fixed union, never a path an admin typed (site/CLAUDE.md §4). The one
 * free-text case, `url`, must be http(s) and opens as a real external link — a
 * router `<Link>` given an absolute URL would navigate to `/https://…`.
 *
 * Shared by the desktop announcements strip and the phone carousel, so both
 * send a student to the same place.
 */
export function BannerLink({ link, className, label, children }: BannerLinkProps) {
  const linkClass = cn(
    'block rounded-xl outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring/50',
    className,
  );

  const to = internalTarget(link);
  if (to !== null) {
    return (
      <Link to={to} aria-label={label} className={linkClass}>
        {children}
      </Link>
    );
  }

  if (link.type === 'url' && isWebUrl(link.url)) {
    return (
      <a href={link.url} target="_blank" rel="noreferrer noopener" aria-label={label} className={linkClass}>
        {children}
      </a>
    );
  }

  return <div className={className}>{children}</div>;
}

/** Whether a banner leads anywhere a student can actually go. */
export function bannerIsTappable(link: StudentHomeBannerLink): boolean {
  return internalTarget(link) !== null || (link.type === 'url' && isWebUrl(link.url));
}

function internalTarget(link: StudentHomeBannerLink): string | null {
  switch (link.type) {
    case 'courses':
      return paths.app.browse();
    case 'services':
      return paths.app.browseServices;
    case 'checklists':
      return paths.app.checklist;
    case 'course':
      return paths.app.courseDetail(link.course_id);
    case 'none':
    case 'url':
      return null;
    default: {
      // A destination added to the union later fails to compile here.
      const unknown: never = link;
      void unknown;

      return null;
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
