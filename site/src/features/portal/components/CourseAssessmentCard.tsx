import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, Info, ListChecks, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { RichText } from '@/components/shared/RichText';
import { paths } from '@/routes/paths';
import type { StudentPaperSummary } from '@shared/types/paper';

/**
 * The course's final assessment: pass mark, length, attempts left, and why it
 * is not open yet when it is not (usually: lessons still to watch).
 *
 * `can_attempt` is the server's say-so; the paper endpoints check it again.
 * Nothing here carries a question or an answer — the summary has none.
 */
export function CourseAssessmentCard({ courseId, paper }: { courseId: number; paper: StudentPaperSummary }) {
  const { t } = useTranslation();
  const disabled = !paper.can_attempt && !paper.has_passed;

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <ClipboardCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground">{paper.title}</h2>
          <p className="text-xs text-muted-foreground">{t('paper.passMark', { mark: paper.pass_mark })}</p>
        </div>
        {paper.has_passed ? (
          <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
            {t('paper.passed')}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Fact icon={ListChecks} label={t('paper.questionCount', { count: paper.questions_count })} />
        <Fact
          icon={RotateCcw}
          label={
            paper.attempts_remaining === null
              ? t('paper.attemptsUnlimited')
              : t('paper.attemptsLeft', { count: paper.attempts_remaining })
          }
        />
      </div>

      {paper.instructions ? <RichText html={paper.instructions} className="mt-4 text-sm text-muted-foreground" /> : null}

      {!paper.can_attempt && paper.blocked_reason ? (
        <p className="mt-4 flex gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          {t(`paper.blocked.${paper.blocked_reason}`)}
        </p>
      ) : null}

      {disabled ? (
        <Button size="lg" variant="secondary" className="mt-4 w-full" disabled>
          {t('paper.start')}
        </Button>
      ) : (
        <Button asChild size="lg" className="mt-4 w-full">
          <Link to={paths.app.paper(courseId)}>{paper.has_passed ? t('paper.title') : t('paper.start')}</Link>
        </Button>
      )}
    </section>
  );
}

function Fact({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-foreground">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </div>
  );
}
