import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';

import { ProgressRing } from '@/components/shared/ProgressRing';
import { paths } from '@/routes/paths';

/**
 * The nudge to finish a half-filled profile, after the app's
 * `ProfileCompletionCard`: a slim row, one tap target, the number in the
 * caption rather than squeezed inside the ring. The caller removes it at 100% —
 * a permanent "done" is dead space on the page students open most.
 */
export function ProfileCompletionStrip({ percent }: { percent: number }) {
  const { t } = useTranslation();
  const title = t('home.profileTitle');
  const body = t('home.profileBody', { percent: Math.round(percent) });

  return (
    <Link
      to={paths.app.profile}
      aria-label={`${title}. ${body}`}
      className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
    >
      {/* Navy rather than gold: a gold arc reads as an award for something unfinished. */}
      <ProgressRing percent={percent} size={36} strokeWidth={4} tone="primary" showValue={false} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-5 text-primary">{title}</span>
        <span className="block truncate text-[11px] leading-4 text-muted-foreground">{body}</span>
      </span>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
