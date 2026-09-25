import { Suspense } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut, Settings } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Container } from '@/components/shared/Container';
import { PageLoader } from '@/components/shared/PageLoader';
import { ScrollManager } from '@/components/shared/ScrollManager';
import { Logo } from '@/components/layout/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { portalNav } from '@/components/layout/siteNav';
import { useSessionStore } from '@/stores/sessionStore';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';

/**
 * The student portal shell: **bottom tab bar on a phone, top nav from `md` up**
 * (root CLAUDE.md §8). Same five destinations in the same order as the mobile
 * app, so a student who learned the app already knows this.
 */
export function PortalLayout() {
  const { t } = useTranslation();
  const student = useSessionStore((s) => s.student);

  const initials =
    student?.full_name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') ?? '';

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <ScrollManager />

      <header className="sticky top-0 z-40 border-b bg-background">
        <Container className="flex h-16 items-center gap-3">
          <Logo />

          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label={t('site.portal.title')}>
            {portalNav.map(({ labelKey, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher className="hidden sm:inline-flex" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={t('site.portal.account')}>
                  <Avatar className="size-8">
                    {student?.profile_photo_url ? (
                      <AvatarImage src={student.profile_photo_url} alt="" />
                    ) : null}
                    <AvatarFallback className="text-xs">{initials || '–'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-52">
                {student ? (
                  <>
                    <div className="px-2 py-1.5">
                      <p className="truncate text-sm font-medium">{student.full_name ?? student.student_id}</p>
                      <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                ) : null}

                <DropdownMenuItem asChild>
                  <Link to={paths.app.profile}>
                    <Settings className="size-4" aria-hidden="true" />
                    {t('profile.title')}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="sm:hidden">
                  <Link to={paths.app.profile}>
                    <Globe className="size-4" aria-hidden="true" />
                    {t('site.lang.label')}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to={paths.home}>
                    <LogOut className="size-4" aria-hidden="true" />
                    {t('site.portal.backToSite')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Container>
      </header>

      {/*
        pb-20 clears the fixed tab bar on a phone. Without it the last row of any
        list sits permanently underneath it and cannot be tapped.
      */}
      <main className="flex-1 pb-20 md:pb-0">
        <Container className="py-4 md:py-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </Container>
      </main>

      <nav
        aria-label={t('site.portal.title')}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-5">
          {portalNav.map(({ labelKey, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  // min-h-14 comfortably clears the 44px tap-target minimum.
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="w-full truncate text-center">{t(labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
