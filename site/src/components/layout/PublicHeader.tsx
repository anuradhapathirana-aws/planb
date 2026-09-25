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
 * Sticky, solid **navy**, and the same height at every width.
 *
 * It is deliberately NOT a transparent header that turns solid over the hero:
 * the hero image is admin-uploaded, so there is no guarantee the logo and links
 * will have anything to contrast against. A solid bar is legible over whatever
 * the admin puts behind it. A border fades in on scroll so the bar separates
 * from the page without a shadow sitting there from the first pixel.
 *
 * **Navy bar, white links** (client instruction, 2026-09-25) — the same
 * `--surface` the footer and the hero use, so the page opens and closes on the
 * brand colour. Two consequences that are not optional:
 *
 *  - **The current page is marked in gold, not `--primary`.** `--primary` *is*
 *    this navy; `aria-[current=page]:text-primary` on a navy bar marks the
 *    current link by making it invisible. Gold on this surface is 6.3:1, the
 *    same pairing the hero headline uses.
 *  - **The logo gets no plate or backing.** It is a circular badge with its own
 *    cream field, so it reads on navy unaided — see `Logo`.
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
        'sticky top-0 z-40 bg-surface text-surface-foreground transition-shadow',
        scrolled ? 'border-b border-surface-border shadow-lg' : 'border-b border-transparent',
      )}
    >
      {/* `h-20`, up from `h-16`: the taller logo needs the room (client
          instruction, 2026-09-25). It stays one height at every width — a bar
          that changes height between breakpoints moves the whole page with it. */}
      <Container className="flex h-20 items-center gap-3">
        <Logo size="lg" />

        <nav className="ml-6 hidden flex-1 items-center gap-1 lg:flex" aria-label={t('site.nav.home')}>
          {publicNav.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              aria-current={isCurrent(item.to, item.isSection) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium text-white transition-colors',
                'hover:bg-white/10',
                // Gold, not `--primary` — see the component docblock.
                'aria-[current=page]:text-accent',
              )}
            >
              {t(`site.nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <LanguageSwitcher onDark className="hidden sm:inline-flex" />

          {/* `accent` rather than the default navy button: the default is
              `--primary`, which is the colour of the bar it now sits on. Gold is
              also the right weight for the one action in the header. */}
          {student ? (
            <Button asChild variant="accent" size="sm" className="gap-1.5">
              <Link to={paths.app.home}>
                <GraduationCap className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t('site.nav.myLearning')}</span>
              </Link>
            </Button>
          ) : (
            <Button variant="accent" size="sm" onClick={onSignIn}>
              {t('site.nav.signIn')}
            </Button>
          )}

          {/* Mobile nav. `lg` rather than `md`: five links plus the language
              switcher and a button need more room than a tablet has. */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              {/* `ghost` would render dark-on-navy. The sheet's own contents stay
                  on a light surface, so only this trigger needs inverting. */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/10 hover:text-white lg:hidden"
                aria-label={t('site.nav.openMenu')}
              >
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
