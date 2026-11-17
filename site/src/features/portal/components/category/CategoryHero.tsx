import { useTranslation } from 'react-i18next';
import { BookOpen, Check, Clock, type LucideIcon } from 'lucide-react';

import { courseCategoryGlyph } from '@/features/marketing/courseCategoryIcons';
import { cn } from '@/lib/utils';
import { formatCourseLength } from '@shared/lib/formatters';
import type { StudentCategoryDetail } from '@shared/types/studentCourse';

type Bundle = NonNullable<StudentCategoryDetail['bundle']>;

/**
 * The tinted card at the top of a Category page — the app's `CategoryHero`:
 * the category's icon, its name (with the main category above it on a
 * sub-category), how many courses and how long, and a "Course bundle" tag when
 * it is sold as one.
 */
export function CategoryHero({ category }: { category: StudentCategoryDetail }) {
  const { t } = useTranslation();
  const length = formatCourseLength(category.total_duration_seconds);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-category-2-foreground/15 bg-category-2 p-4">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-card bg-card">
        {category.icon_image_url ? (
          <img src={category.icon_image_url} alt="" className="size-8 object-contain" />
        ) : (
          <HeroGlyph icon={courseCategoryGlyph(category.icon ?? category.parent?.icon ?? null)} />
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-0.5">
        {category.parent ? (
          <p className="truncate text-[11px] leading-[18px] text-muted-foreground">{category.parent.name}</p>
        ) : null}
        <h1 className="line-clamp-2 text-[20px] font-semibold leading-7 text-primary">{category.name}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3.5 text-primary" aria-hidden="true" />
            {t('bundle.coursesCount', { count: category.courses_count })}
          </span>
          {length !== '' ? (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-primary" aria-hidden="true" />
              {length}
            </span>
          ) : null}
        </p>
        {category.selling_mode === 'bundle' ? (
          <span className="mt-1 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary-foreground uppercase">
            {t('bundle.badge')}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** The registry glyph, passed in rather than picked here, so it is not a component made during render. */
function HeroGlyph({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-[26px] text-category-2-foreground" aria-hidden="true" />;
}

/** What buying the bundle means, while there is still something left to buy. */
export function BundleBenefits({ bundle }: { bundle: Bundle }) {
  const { t } = useTranslation();

  return (
    <ul className="space-y-1.5">
      <Benefit>{t('bundle.benefitAll', { name: bundle.name })}</Benefit>
      {bundle.owned_count > 0 ? <Benefit>{t('bundle.benefitOwned', { count: bundle.owned_count })}</Benefit> : null}
      <Benefit>{t('bundle.benefitForever')}</Benefit>
    </ul>
  );
}

function Benefit({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2 text-[13px] leading-5 text-foreground">
      <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/10')}>
        <Check className="size-3 text-success" aria-hidden="true" />
      </span>
      {children}
    </li>
  );
}
