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
const CoursesPage = lazy(() =>
  import('@/features/catalogue/pages/CoursesPage').then((m) => ({ default: m.CoursesPage })),
);
const CourseDetailPage = lazy(() =>
  import('@/features/catalogue/pages/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })),
);
const BundlePage = lazy(() =>
  import('@/features/catalogue/pages/BundlePage').then((m) => ({ default: m.BundlePage })),
);
const PortalCourseDetailPage = lazy(() =>
  import('@/features/portal/pages/PortalCourseDetailPage').then((m) => ({ default: m.PortalCourseDetailPage })),
);
const LessonPage = lazy(() =>
  import('@/features/player/pages/LessonPage').then((m) => ({ default: m.LessonPage })),
);
const CheckoutPage = lazy(() =>
  import('@/features/checkout/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
const PortalHomePage = lazy(() =>
  import('@/features/portal/pages/PortalHomePage').then((m) => ({ default: m.PortalHomePage })),
);
const MyCoursesPage = lazy(() =>
  import('@/features/portal/pages/MyCoursesPage').then((m) => ({ default: m.MyCoursesPage })),
);
const ServicesPage = lazy(() =>
  import('@/features/services/pages/ServicesPage').then((m) => ({ default: m.ServicesPage })),
);
const ServiceDetailPage = lazy(() =>
  import('@/features/services/pages/ServiceDetailPage').then((m) => ({ default: m.ServiceDetailPage })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const ChecklistPage = lazy(() =>
  import('@/features/checklist/pages/ChecklistPage').then((m) => ({ default: m.ChecklistPage })),
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
          { path: paths.courses, element: <CoursesPage /> },
          { path: '/courses/:slug', element: <CourseDetailPage /> },
          { path: '/bundles/:slug', element: <BundlePage /> },
          { path: paths.services, element: <PlaceholderPage title="Services" task="PUB-6" /> },
          { path: '/checkout/:orderId', element: <CheckoutPage /> },
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
          { index: true, element: <PortalHomePage /> },
          { path: 'courses', element: <MyCoursesPage /> },
          { path: 'courses/:id', element: <PortalCourseDetailPage /> },
          { path: 'courses/:id/paper', element: <PlaceholderPage title="Assessment" task="POR-5" /> },
          { path: 'lessons/:id', element: <LessonPage /> },
          { path: 'paper-attempts/:attemptId', element: <PlaceholderPage title="Result" task="POR-5" /> },
          { path: 'services', element: <ServicesPage /> },
          { path: 'services/:id', element: <ServiceDetailPage /> },
          { path: 'checklist', element: <ChecklistPage /> },
          { path: 'orders', element: <PlaceholderPage title="Orders" task="POR-8" /> },
          { path: 'wishlist', element: <PlaceholderPage title="Saved courses" task="POR-10" /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },

      // An unknown path goes home. A real 404 page is PUB-2's.
      { path: '*', element: <Navigate to={paths.home} replace /> },
    ],
  },
]);
