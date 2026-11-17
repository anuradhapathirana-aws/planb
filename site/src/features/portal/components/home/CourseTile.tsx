import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Heart, Loader2, Lock, ShoppingCart } from 'lucide-react';

import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import { formatMoney } from '@shared/lib/formatters';
import type { StudentCourseSummary } from '@shared/types/studentCourse';

interface CourseTileProps {
  course: StudentCourseSummary;
  /** Heart tapped. Omit to draw no heart. */
  onToggleWishlist?: (course: StudentCourseSummary) => void;
  /**
   * The cart button (Browse). `onEnrol` is undefined when the course cannot be
   * bought from here right now — a paid course while payments are off — and
   * the cart is then left out while the price stays. A bundled course's cart
   * opens its bundle instead: a bundle is only bought with its contents in view.
   */
  purchase?: { onEnrol: (() => void) | undefined; enrolling: boolean };
  className?: string;
}

/**
 * A course as the app's compact `CourseGridCard` draws it: 16:9 artwork with
 * its place in the category ("Course 9") and a lock when not owned, then the
 * name, the category, and the price with a heart.
 *
 * The artwork and name are one link; the heart is its own button beside the
 * price, outside that link — a button nested in a link is invalid and reads
 * twice to a screen reader. The course page sorts out owned vs not: a course
 * the student does not own redirects to its public page with the Enrol button.
 *
 * **No star rating**, unlike the app: the app's is placeholder data generated
 * from the course id (`courseSocialProof.ts`, "SAMPLE DATA — NOT REAL"), and it
 * stays off the website until there are real reviews to show.
 */
export function CourseTile({ course, onToggleWishlist, purchase, className }: CourseTileProps) {
  const { t } = useTranslation();
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const bundle = course.sold_individually ? null : course.bundle;
  const price = course.is_free
    ? t('courses.free')
    : bundle
      ? t('bundle.tileLabel')
      : formatMoney(course.price_cents, course.currency);

  const wishlisted = course.is_wishlisted;

  return (
    <div className={cn('flex flex-col', className)}>
      <Link
        to={paths.app.courseDetail(course.id)}
        className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
      >
        <span className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
          {course.thumbnail_url && !thumbnailFailed ? (
            <img
              src={course.thumbnail_url}
              alt=""
              loading="lazy"
              onError={() => setThumbnailFailed(true)}
              className="size-full object-cover"
            />
          ) : (
            <BookOpen className="size-6 text-muted-foreground" aria-hidden="true" />
          )}

          {course.position !== null ? (
            <span className="absolute top-2 left-2 rounded-md bg-primary/80 px-2 py-0.5 text-[10px] font-semibold leading-4 text-primary-foreground">
              {t('courses.orderBadge', { number: course.position })}
            </span>
          ) : null}

          {!course.is_enrolled ? (
            <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-card">
              <Lock className="size-3 text-muted-foreground" aria-label={t('courses.lockedBadge')} />
            </span>
          ) : null}
        </span>

        <span className="mt-2 line-clamp-2 block text-[12px] font-medium leading-[17px] text-primary">{course.name}</span>
        <span className="mt-0.5 block truncate text-[9px] font-medium uppercase leading-4 tracking-wide text-muted-foreground">
          {course.category_name || ' '}
        </span>
      </Link>

      {onToggleWishlist || purchase ? (
        // `mt-auto` pins the price row to the bottom, so a one-line name beside a
        // two-line one still leaves both tiles' rows level.
        <div className="mt-auto flex items-center justify-between gap-1.5 pt-1.5">
          <span className="truncate text-[13px] font-bold leading-[21px] text-primary">{price}</span>

          <span className="flex items-center gap-1.5">
            {onToggleWishlist ? (
              <button
                type="button"
                onClick={() => onToggleWishlist(course)}
                aria-label={`${wishlisted ? t('wishlist.remove') : t('wishlist.add')}. ${course.name}`}
                aria-pressed={wishlisted}
                className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted"
              >
                <Heart className={cn('size-[18px]', wishlisted && 'fill-primary')} aria-hidden="true" />
              </button>
            ) : null}

            {purchase ? <CartButton course={course} price={price} purchase={purchase} bundleCategoryId={bundle?.category_id} /> : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

const CART_CLASS =
  'flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-80 disabled:opacity-60';

interface CartButtonProps {
  course: StudentCourseSummary;
  price: string;
  purchase: NonNullable<CourseTileProps['purchase']>;
  bundleCategoryId: number | undefined;
}

/** The navy cart square. Nothing about price is decided here — the server prices the enrolment. */
function CartButton({ course, price, purchase, bundleCategoryId }: CartButtonProps) {
  const { t } = useTranslation();
  const label = `${t('enrol.action')}. ${course.name}. ${price}`;

  if (bundleCategoryId !== undefined) {
    return (
      <Link to={paths.app.category(bundleCategoryId)} aria-label={label} className={CART_CLASS}>
        <ShoppingCart className="size-4" aria-hidden="true" />
      </Link>
    );
  }

  if (!purchase.onEnrol) return null;

  return (
    <button
      type="button"
      onClick={purchase.onEnrol}
      disabled={purchase.enrolling}
      aria-label={label}
      aria-busy={purchase.enrolling}
      className={CART_CLASS}
    >
      {purchase.enrolling ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <ShoppingCart className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
