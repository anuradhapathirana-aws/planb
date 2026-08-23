import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

export function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <AdminSidebar />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0 [&>button]:text-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AdminSidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* No header bar above the content area — the sidebar carries nav and
          the user menu. On mobile (sidebar hidden), this trigger is the only
          way to open the nav drawer, so it floats above the content instead
          of sitting in a full-width header. */}
      <Button
        variant="secondary"
        size="icon"
        className="fixed top-3 left-3 z-30 shadow-md lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open menu"
      >
        <Menu />
      </Button>

      <div className="lg:pl-64">
        {/* Caps content width on very wide monitors (UI_UX_GUIDELINES.md §3
            "Desktop Maximization") — standard 1366–1920px business monitors
            never hit this cap; it only stops content stretching edge-to-edge
            on ultra-wide displays. */}
        <main className="mx-auto max-w-[1920px] p-3 pt-16 sm:p-4 lg:pt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
