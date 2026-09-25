import { Container } from '@/components/shared/Container';
import type { HeroHighlight } from '@/features/marketing/homeContent';

/**
 * The reassurance strip directly under the hero — the PDF's "100% Virtual
 * Learning / Job-Ready Skills / …" band.
 *
 * It straddles the hero and the page below it rather than sitting inside
 * either, which is what visually ties the navy block to the white one. On a
 * phone it becomes a single column: four tiny columns of two-line text is
 * unreadable at 360px, and shrinking the type to fit is worse.
 */
export function HeroHighlights({ items }: { items: HeroHighlight[] }) {
  return (
    <div className="border-b bg-background">
      <Container>
        <ul className="grid gap-x-8 gap-y-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
                <Icon className="size-5 text-accent-strong" aria-hidden="true" />
              </span>

              <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}
