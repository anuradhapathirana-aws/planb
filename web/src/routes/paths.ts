export const paths = {
  login: '/login',
  admin: {
    root: '/admin',
    dashboard: '/admin',
    students: '/admin/students',
    studentDetail: (id: number | string) => `/admin/students/${id}`,
    industries: '/admin/industries',
    professions: '/admin/professions',
    courses: '/admin/courses',
    courseNew: '/admin/courses/new',
    courseEdit: (id: number | string) => `/admin/courses/${id}/edit`,
    coursePaper: (id: number | string) => `/admin/courses/${id}/paper`,
    courseCategories: '/admin/courses/categories',
  },
} as const;
