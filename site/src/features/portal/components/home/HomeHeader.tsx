import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmptyState } from '@/components/shared/EmptyState';
import { paths } from '@/routes/paths';
import { firstNameOf, initialsOf } from '@/lib/initials';
import type { StudentProfile } from '@shared/types/studentAuth';

/**
 * Photo, greeting and the bell — the top row of the phone Home, after the app's
 * `HomeHeader`. "Hello, 👋" on one line and the name alone on the next, so a long
 * name truncates on its own line without dragging the greeting with it.
 *
 * The whole greeting is the link to Profile, not just the avatar: a 42px circle
 * alone is under the 44px tap minimum.
 */
export function HomeHeader({ student }: { student: StudentProfile | null }) {
  const { t } = useTranslation();
  const firstName = firstNameOf(student?.full_name);

  return (
    <div className="flex items-center gap-3">
      <Link
        to={paths.app.profile}
        aria-label={t('profile.title')}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
      >
        <Avatar className="size-[42px]">
          {student?.profile_photo_url ? <AvatarImage src={student.profile_photo_url} alt="" /> : null}
          <AvatarFallback className="bg-primary text-[15px] font-semibold text-primary-foreground">
            {initialsOf(student?.full_name) || '–'}
          </AvatarFallback>
        </Avatar>

        <span className="min-w-0 flex-1">
          {firstName !== undefined ? (
            <span className="block truncate text-[13px] leading-[18px] text-muted-foreground">
              {t('home.greeting')}
            </span>
          ) : null}
          <span className="block truncate text-[18px] font-semibold leading-7 text-primary">
            {firstName !== undefined ? t('home.greetingName', { name: firstName }) : t('home.greetingFallback')}
          </span>
        </span>
      </Link>

      <NotificationsButton />
    </div>
  );
}

/**
 * The bell. There is no notification feed yet — the app's Notifications screen
 * is the same empty state — so on the web it opens a small panel saying so
 * rather than a whole page with nothing on it.
 */
function NotificationsButton() {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t('notifications.title')}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-60"
      >
        <Bell className="size-[22px]" aria-hidden="true" />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        <EmptyState
          icon={Bell}
          title={t('notifications.emptyTitle')}
          body={t('notifications.emptyBody')}
          className="border-0 py-6"
        />
      </PopoverContent>
    </Popover>
  );
}
