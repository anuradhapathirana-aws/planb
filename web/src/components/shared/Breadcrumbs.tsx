import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Trail for nested/drilled-into pages (e.g. Students > Anuradha Perera) — per
 * UI_UX_GUIDELINES.md §1. Top-level sidebar pages don't need this; the sidebar
 * already shows where you are. The last item is the current page (no link).
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link to={item.href} className="text-muted-foreground hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
