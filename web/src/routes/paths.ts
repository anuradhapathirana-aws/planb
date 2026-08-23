export const paths = {
  login: '/login',
  admin: {
    root: '/admin',
    dashboard: '/admin',
    students: '/admin/students',
    studentDetail: (id: number | string) => `/admin/students/${id}`,
    industries: '/admin/industries',
    professions: '/admin/professions',
  },
} as const;
