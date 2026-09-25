/**
 * Every route in this app, in one place.
 *
 * Public pages sit at the root; the student portal lives under `/app`. There is
 * no `/login` route — sign-in is a dialog from the header, so a visitor keeps
 * their place on the page (docs/WEBSITE_AND_PORTAL_GUIDE.md §4).
 */
export const paths = {
  home: '/',
  courses: '/courses',
  courseDetail: (slug: string | number) => `/courses/${slug}`,
  bundles: '/bundles',
  bundleDetail: (slug: string | number) => `/bundles/${slug}`,
  services: '/services',
  checkout: (orderId: number | string) => `/checkout/${orderId}`,
  paymentReturn: (status: string) => `/payment/${status}`,
  privacy: '/privacy',
  terms: '/terms',

  /** In-page anchors on the home page. Must match the section registry's ids. */
  section: (id: string) => `/#${id}`,

  app: {
    root: '/app',
    home: '/app',
    courses: '/app/courses',
    courseDetail: (id: number | string) => `/app/courses/${id}`,
    lesson: (id: number | string) => `/app/lessons/${id}`,
    paper: (courseId: number | string) => `/app/courses/${courseId}/paper`,
    paperResult: (attemptId: number | string) => `/app/paper-attempts/${attemptId}`,
    services: '/app/services',
    checklist: '/app/checklist',
    orders: '/app/orders',
    wishlist: '/app/wishlist',
    profile: '/app/profile',
  },
} as const;
