import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from '@/routes/guards';
import { FullScreenSpinner } from '@/components/shared/FullScreenSpinner';
import { PageLoader } from '@/components/shared/PageLoader';
import { paths } from '@/routes/paths';

/**
 * Route-based code splitting (UI_UX_GUIDELINES.md §2): each page — and the
 * admin shell itself — is its own chunk, so a student-area visit (once that
 * area exists) never downloads admin table/chart code and vice versa. Worth
 * setting up now, while there are only a handful of routes, rather than
 * retrofitting it once Courses/Jobs/Payments etc. are all built out.
 */
const AdminLayout = lazy(() => import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/dashboard/pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const StudentsListPage = lazy(() =>
  import('@/features/admin/students/pages/StudentsListPage').then((m) => ({ default: m.StudentsListPage })),
);
const StudentDetailPage = lazy(() =>
  import('@/features/admin/students/pages/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage })),
);
const IndustriesListPage = lazy(() =>
  import('@/features/admin/industries/pages/IndustriesListPage').then((m) => ({ default: m.IndustriesListPage })),
);
const ProfessionsListPage = lazy(() =>
  import('@/features/admin/professions/pages/ProfessionsListPage').then((m) => ({ default: m.ProfessionsListPage })),
);

/** Wraps a lazy page so its chunk loading shows an in-content spinner, not a blank page. */
function page(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={paths.admin.dashboard} replace /> },
  {
    path: paths.login,
    element: (
      <Suspense fallback={<FullScreenSpinner />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: paths.admin.root,
    element: (
      <RequireAuth>
        <Suspense fallback={<FullScreenSpinner />}>
          <AdminLayout />
        </Suspense>
      </RequireAuth>
    ),
    children: [
      { index: true, element: page(<AdminDashboardPage />) },
      { path: 'students', element: page(<StudentsListPage />) },
      { path: 'students/:id', element: page(<StudentDetailPage />) },
      { path: 'industries', element: page(<IndustriesListPage />) },
      { path: 'professions', element: page(<ProfessionsListPage />) },
    ],
  },
  { path: '*', element: <Navigate to={paths.admin.dashboard} replace /> },
]);
