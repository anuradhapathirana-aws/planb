/**
 * Barrel for `@planb/shared`.
 *
 * Both apps may import deep paths (`@shared/types/course`) — that is usually
 * clearer at the call site and keeps bundles honest. This barrel exists for
 * the cases where a single import reads better, and as the one place that
 * lists everything the package offers.
 */

// API envelopes and admin-facing contracts (mirrors backend/app/Http/Resources/)
export * from './types/api';
export * from './types/auth';
export * from './types/checklist';
export * from './types/course';
export * from './types/industry';
export * from './types/profession';
export * from './types/student';

// Student-facing contracts (mirrors backend/app/Http/Resources/Student/)
export * from './types/paper';
export * from './types/progress';
export * from './types/studentAuth';
export * from './types/studentCourse';

// Zod schemas — UX validation only; the backend is the enforcement point.
export * from './schemas/studentAuth';
export * from './schemas/studentProfile';

// Platform-neutral helpers.
export * from './lib/clientKey';
export * from './lib/formatters';
export * from './lib/serverErrors';

export * from './theme/tokens';
