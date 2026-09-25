import { Construction } from 'lucide-react';
import { Container } from '@/components/shared/Container';

/**
 * Stands in for a route the shell can already reach but whose page is not built
 * yet, so the navigation can be walked and reviewed end to end before any page
 * exists.
 *
 * `task` names the guide task that replaces it — every one of these must be gone
 * before the site goes live, and the task id is how you find what is left.
 */
export function PlaceholderPage({ title, task }: { title: string; task: string }) {
  return (
    <Container className="flex min-h-[55vh] flex-col items-center justify-center gap-3 py-16 text-center">
      <Construction className="size-8 text-accent" aria-hidden="true" />
      <h1 className="text-2xl font-bold tracking-tight text-primary">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page is not built yet. It arrives with <span className="font-medium text-foreground">{task}</span> in
        docs/WEBSITE_AND_PORTAL_GUIDE.md.
      </p>
    </Container>
  );
}
