import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Container } from '@/components/shared/Container';
import { Logo } from '@/components/layout/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { publicNav } from '@/components/layout/siteNav';
import { useSessionStore } from '@/stores/sessionStore';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';

/**
 * Sticky, solid, and the same height at every width.
 *
 * It is deliberately NOT a transparent header that turns solid over the hero:
 * the hero image is admin-uploaded, so there is no guarantee the logo and links
 * will have anything to contrast against. A solid bar is legible over whatever
 * the admin puts behind it. A border fades in on scroll so the bar separates
 * from the page without a shadow sitting there from the first pixel.
 */
export function PublicHeader({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useTranslation();
  const { pathname, hash } = useLocation();
  const student = useSessionStore((s) => s.student);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /*
   * A section link is current only while that section is the active anchor.
   * Home is an exact match — `pathname.startsWith('/')` is true on every page,
   * so a prefix test would light Home up everywhere — and it stops being
   * current once a section anchor takes over.
   */
  const isCurrent = (to: string, isSection?: boolean) => {
    if (isSection) return pathname === paths.home && hash === to.slice(1);
    if (to === paths.home) return pathname === paths.home && hash === '';

    return pathname.startsWith(to);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/95 backdrop-blur transition-shadow',
        scrolled ? 'border-b border-border' : 'border-b border-transparent',
      )}
    >
      <Container className="flex h-16 items-center gap-3">
        <Logo />

        <nav className="ml-6 hidden flex-1 items-center gap-1 lg:flex" aria-label={t('site.nav.home')}>
          {publicNav.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              aria-current={isCurrent(item.to, item.isSection) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-secondary hover:text-secondary-foreground',
                'aria-[current=page]:text-primary',
              )}
            >
              {t(`site.nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <LanguageSwitcher className="hidden sm:inline-flex" />

          {student ? (
            <Button asChild size="sm" className="gap-1.5">
              <Link to={paths.app.home}>
                <GraduationCap className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t('site.nav.myLearning')}</span>
              </Link>
            </Button>
          ) : (
            <Button size="sm" onClick={onSignIn}>
              {t('site.nav.signIn')}
            </Button>
          )}

          {/* Mobile nav. `lg` rather than `md`: five links plus the language
              switcher and a button need more room than a tablet has. */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t('site.nav.openMenu')}>
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="flex w-72 flex-col gap-1 p-4 pt-14">
              {/* Radix requires a title for the dialog's accessible name. */}
              <SheetTitle className="sr-only">{t('site.nav.openMenu')}</SheetTitle>

              {publicNav.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-md px-3 text-base font-medium hover:bg-secondary"
                >
                  {t(`site.nav.${item.key}`)}
                </NavLink>
              ))}

              <div className="mt-auto border-t pt-3">
                <LanguageSwitcher className="w-full justify-start" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
