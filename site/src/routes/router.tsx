import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RootLayout } from '@/components/layout/RootLayout';
import { FullScreenSpinner } from '@/components/shared/FullScreenSpinner';
import { PlaceholderPage } from '@/components/shared/PlaceholderPage';
import { RequireStudent } from '@/routes/guards';
import { paths } from '@/routes/paths';

/**
 * Route-based code splitting from the first route rather than retrofitted.
 *
 * It matters more here than in the admin panel: a visitor landing on the
 * marketing home must not download the portal's video player, and Google grades
 * the page on how fast it becomes usable. Each shell is its own chunk too, so a
 * student going straight to `/app` never downloads the marketing sections.
 *
 * Routes still showing a `PlaceholderPage` are rendered directly rather than
 * lazily — there is nothing to split until the real page exists, and the task
 * that builds it converts the route to `lazy` at the same time.
 */
/*
 * Both shells are lazy, not just the pages inside them. The portal's header
 * pulls in Radix's dropdown-menu and avatar, which together are a large slice of
 * the bundle and are of no use whatsoever to a first-time marketing visitor —
 * and vice versa for a student who opens `/app` directly.
 */
const PublicLayout = lazy(() =>
  import('@/components/layout/PublicLayout').then((m) => ({ default: m.PublicLayout })),
);
const PortalLayout = lazy(() =>
  import('@/components/layout/PortalLayout').then((m) => ({ default: m.PortalLayout })),
);

const HomePage = lazy(() =>
  import('@/features/marketing/pages/HomePage').then((m) => ({ default: m.HomePage })),
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // ---------------------------------------------------------------- public
      {
        element: (
          <Suspense fallback={<FullScreenSpinner />}>
            <PublicLayout />
          </Suspense>
        ),
        children: [
          { path: paths.home, element: <HomePage /> },
          { path: paths.courses, element: <PlaceholderPage title="Courses" task="PUB-3" /> },
          { path: '/courses/:slug', element: <PlaceholderPage title="Course" task="PUB-4" /> },
          { path: '/bundles/:slug', element: <PlaceholderPage title="Bundle" task="PUB-5" /> },
          { path: paths.services, element: <PlaceholderPage title="Services" task="PUB-6" /> },
          { path: '/checkout/:orderId', element: <PlaceholderPage title="Checkout" task="PUB-8" /> },
          { path: '/payment/:status', element: <PlaceholderPage title="Payment" task="PUB-9" /> },
          { path: paths.privacy, element: <PlaceholderPage title="Privacy policy" task="PUB-2" /> },
          { path: paths.terms, element: <PlaceholderPage title="Terms of service" task="PUB-2" /> },
        ],
      },

      // ----------------------------------------------------------- student app
      {
        path: paths.app.root,
        element: (
          <RequireStudent>
            <Suspense fallback={<FullScreenSpinner />}>
              <PortalLayout />
            </Suspense>
          </RequireStudent>
        ),
        children: [
          { index: true, element: <PlaceholderPage title="My learning" task="POR-2" /> },
          { path: 'courses', element: <PlaceholderPage title="My courses" task="POR-3" /> },
          { path: 'courses/:id', element: <PlaceholderPage title="Course" task="POR-3" /> },
          { path: 'courses/:id/paper', element: <PlaceholderPage title="Assessment" task="POR-5" /> },
          { path: 'lessons/:id', element: <PlaceholderPage title="Lesson" task="POR-4" /> },
          { path: 'paper-attempts/:attemptId', element: <PlaceholderPage title="Result" task="POR-5" /> },
          { path: 'services', element: <PlaceholderPage title="Services" task="POR-6" /> },
          { path: 'checklist', element: <PlaceholderPage title="Checklist" task="POR-7" /> },
          { path: 'orders', element: <PlaceholderPage title="Orders" task="POR-8" /> },
          { path: 'wishlist', element: <PlaceholderPage title="Saved courses" task="POR-10" /> },
          { path: 'profile', element: <PlaceholderPage title="Profile" task="POR-9" /> },
        ],
      },

      // An unknown path goes home. A real 404 page is PUB-2's.
      { path: '*', element: <Navigate to={paths.home} replace /> },
    ],
  },
]);
