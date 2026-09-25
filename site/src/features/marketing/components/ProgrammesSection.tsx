import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProgrammeCard } from '@/features/marketing/components/ProgrammeCard';
import { paths } from '@/routes/paths';
import type { ProgrammeCard as Programme } from '@/features/marketing/homeContent';

/**
 * "Our **Programmes**" — the course grid under the hero.
 *
 * Four across on a large screen, two on a tablet, one on a phone. Not three:
 * the cards come from an admin-managed list whose length is unpredictable, and
 * a four-column grid degrades to 2×2 cleanly at every count, where three leaves
 * an orphan on most.
 *
 * `API-2` replaces the `programmes` prop's source with `GET public/courses`;
 * nothing in this component or the card below it changes when it does.
 */
export function ProgrammesSection({
  id,
  programmes,
}: {
  id?: string;
  programmes: Programme[];
}) {
  return (
    <section id={id} className="scroll-mt-20 py-16 sm:py-20">
      <Container>
        <SectionHeading
          title="Our **Programmes**"
          body="Practical courses built for Sri Lankans moving to the Emirates — learn at your own pace, in English or Sinhala."
          action={
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to={paths.courses}>
                View all courses
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          }
        />

        {programmes.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="No courses published yet"
            body="New programmes are added regularly. Check back soon, or get in touch and we will tell you when one opens."
          />
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {programmes.map((programme) => (
              <ProgrammeCard key={programme.id} programme={programme} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
