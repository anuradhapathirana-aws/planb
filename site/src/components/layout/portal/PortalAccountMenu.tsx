import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, Loader2, LogOut, Settings } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { useSessionStore } from '@/stores/sessionStore';
import { paths } from '@/routes/paths';
import { initialsOf } from '@/lib/initials';

/** The avatar button in the portal header and the account menu it opens. */
export function PortalAccountMenu() {
  const { t } = useTranslation();
  const student = useSessionStore((s) => s.student);
  const signOut = useSignOut();
  const initials = initialsOf(student?.full_name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={t('site.portal.account')}>
          <Avatar className="size-8">
            {student?.profile_photo_url ? <AvatarImage src={student.profile_photo_url} alt="" /> : null}
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

        <DropdownMenuItem asChild>
          <Link to={paths.home}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('site.portal.backToSite')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={signOut.isPending}
          onSelect={() => signOut.mutate()}
        >
          {signOut.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-4 text-destructive" aria-hidden="true" />
          )}
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
