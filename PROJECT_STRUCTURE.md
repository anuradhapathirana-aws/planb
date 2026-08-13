# Project Structure — Plan B International (Web-Only PWA)

This document explains the full folder layout across two sub-projects: `backend/` and `web/`. Read `CLAUDE.md` first for the coding rules.

## Root Layout

```
planb/
├── backend/                        Laravel 11 API
├── web/                            React 18 + TypeScript + Vite + PWA
├── docs/                           SRS, schema, deployment guides
│   ├── SRS_PlanB_International_v1.2.docx
│   ├── Budget_Proposal_PlanB_v1.1.docx
│   ├── schema.md
│   ├── api-endpoints.md
│   ├── deployment.md
│   └── CHANGELOG.md
├── .github/                        GitHub Actions CI/CD
├── .claude/                        Claude Code project settings (optional)
├── CLAUDE.md                       Instructions for Claude Code (read first)
├── PROJECT_STRUCTURE.md            This file
├── README.md                       Setup and quickstart
└── .gitignore
```

## Backend (`backend/`)

Standard Laravel 11 structure with domain-grouped services.

```
backend/
├── app/
│   ├── Console/Commands/           Custom artisan commands
│   ├── Enums/                      OrderStatus, UserRole, PaymentMethod, etc.
│   ├── Events/
│   ├── Exceptions/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/V1/             All API endpoints (v1)
│   │   │   │   ├── Auth/           AuthController, OtpController
│   │   │   │   ├── Course/         PhaseController, TopicController, VideoController, QuizController, ProgressController
│   │   │   │   ├── Payment/        PaymentController, BankTransferController
│   │   │   │   ├── PremiumService/
│   │   │   │   ├── Checklist/
│   │   │   │   ├── Job/
│   │   │   │   ├── Student/        ProfileController
│   │   │   │   └── Notification/
│   │   │   └── Admin/              Admin-only endpoints
│   │   │       ├── StudentManagementController.php
│   │   │       ├── ContentController.php
│   │   │       ├── OrderQueueController.php
│   │   │       ├── PaymentVerificationController.php
│   │   │       ├── AccountsController.php
│   │   │       └── ReportsController.php
│   │   ├── Middleware/
│   │   │   ├── EnsureStudentApproved.php
│   │   │   └── AdminRole.php
│   │   ├── Requests/               Form request validation
│   │   │   ├── Auth/
│   │   │   ├── Course/
│   │   │   ├── Payment/
│   │   │   └── ...
│   │   └── Resources/              API response transformers
│   │       ├── StudentResource.php
│   │       ├── CourseResource.php
│   │       ├── TopicResource.php
│   │       └── ...
│   ├── Jobs/                       Queued jobs
│   │   ├── SendOtpEmail.php
│   │   ├── SendWebPushNotification.php
│   │   ├── ProcessPaymentWebhook.php
│   │   └── GenerateCertificate.php
│   ├── Models/                     Eloquent models (one per table)
│   │   ├── User.php
│   │   ├── Student.php
│   │   ├── Phase.php
│   │   ├── Topic.php
│   │   ├── Video.php
│   │   ├── Assessment.php
│   │   ├── Question.php
│   │   ├── QuizAttempt.php
│   │   ├── Progress.php
│   │   ├── Order.php
│   │   ├── Payment.php
│   │   ├── BankTransfer.php
│   │   ├── ChecklistItem.php
│   │   ├── ChecklistProgress.php
│   │   ├── PremiumService.php
│   │   ├── ServiceOrder.php
│   │   ├── Job.php
│   │   ├── SuccessStory.php
│   │   ├── IncomeRecord.php
│   │   ├── ExpenseRecord.php
│   │   └── Certificate.php
│   ├── Notifications/              Laravel notifications
│   ├── Observers/                  Model event listeners
│   ├── Policies/                   Authorization rules
│   ├── Providers/
│   ├── Services/                   Business logic (domain-grouped)
│   │   ├── Auth/
│   │   │   ├── OtpService.php
│   │   │   └── RegistrationService.php
│   │   ├── Course/
│   │   │   ├── VideoWatchTrackingService.php
│   │   │   ├── VideoSignedUrlService.php     Bunny Stream signed URL generation
│   │   │   ├── QuizGradingService.php
│   │   │   ├── ProgressCalculationService.php
│   │   │   └── CourseUnlockService.php
│   │   ├── Payment/
│   │   │   ├── PayHereGatewayService.php
│   │   │   ├── BankTransferService.php
│   │   │   └── ReceiptService.php
│   │   ├── PremiumService/
│   │   │   └── ServiceOrderFulfillmentService.php
│   │   ├── Checklist/
│   │   │   └── ChecklistProgressService.php
│   │   ├── Certificate/
│   │   │   └── CertificateGeneratorService.php
│   │   ├── Notification/
│   │   │   ├── WebPushService.php            Firebase Cloud Messaging Web
│   │   │   └── WhatsAppService.php
│   │   └── Report/
│   │       ├── FinancialReportService.php
│   │       └── ProgressReportService.php
│   └── Support/                    Helpers, utilities
├── bootstrap/
├── config/
│   ├── payment.php                 PayHere config
│   ├── bunny.php                   Bunny Stream/Storage config
│   ├── firebase.php
│   └── ...
├── database/
│   ├── factories/                  Model factories for testing
│   ├── migrations/                 Timestamped schema changes
│   └── seeders/                    Initial data (phases, topics, checklist items)
├── public/
├── resources/
│   └── views/                      Email templates
├── routes/
│   ├── api.php                     API routes
│   └── console.php
├── storage/
├── tests/
│   ├── Feature/                    API endpoint tests
│   └── Unit/                       Service tests
├── .env.example
├── composer.json
├── phpunit.xml
└── artisan
```

### Backend Layering — How a Request Flows

```
Route  →  Controller  →  Form Request (validate)  →  Service (business logic)  →  Model (DB)
                                                          ↓
                        API Resource (transform)  ←  Return
```

Never skip a layer. If you find yourself doing DB queries in a controller, move to a Service.

## Web (`web/`) — Single App with Role-Based Routing

Feature-based organization split by role area (marketing / auth / student / admin).

```
web/
├── public/
│   ├── icons/                      PWA icons (192, 512, maskable)
│   ├── robots.txt
│   └── favicon.ico
├── src/
│   ├── api/                        API client + typed endpoint functions
│   │   ├── client.ts               Axios instance, auth interceptor, error handling
│   │   ├── auth.api.ts
│   │   ├── students.api.ts
│   │   ├── courses.api.ts
│   │   ├── topics.api.ts
│   │   ├── videos.api.ts           Signed URL requests
│   │   ├── quizzes.api.ts
│   │   ├── payments.api.ts
│   │   ├── orders.api.ts
│   │   ├── checklists.api.ts
│   │   ├── jobs.api.ts
│   │   ├── premiumServices.api.ts
│   │   ├── accounts.api.ts
│   │   └── reports.api.ts
│   ├── components/
│   │   ├── ui/                     shadcn/ui primitives (button, card, dialog, sheet, etc.)
│   │   ├── layout/
│   │   │   ├── PublicLayout.tsx    Marketing pages
│   │   │   ├── AuthLayout.tsx      Login, register, OTP
│   │   │   ├── StudentLayout.tsx   Bottom tabs (mobile) / top nav (desktop)
│   │   │   ├── AdminLayout.tsx     Sidebar
│   │   │   ├── StudentBottomNav.tsx
│   │   │   ├── StudentTopNav.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   └── shared/                 Cross-role reusable
│   │       ├── DataTable.tsx       TanStack Table wrapper
│   │       ├── FileUpload.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── CurrencyDisplay.tsx
│   │       ├── DateDisplay.tsx
│   │       ├── LoadingSkeleton.tsx
│   │       ├── WhatsAppButton.tsx
│   │       ├── InstallAppBanner.tsx  PWA install prompt
│   │       └── NoSkipVideoPlayer.tsx Critical shared component
│   ├── features/
│   │   ├── marketing/              PUBLIC — no auth needed
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   │   ├── LandingPage.tsx
│   │   │   │   ├── AboutPage.tsx
│   │   │   │   ├── ServicesPage.tsx
│   │   │   │   ├── SuccessStoriesPage.tsx
│   │   │   │   └── ContactPage.tsx
│   │   │   └── hooks/
│   │   ├── auth/                   PUBLIC — login/register flow
│   │   │   ├── components/
│   │   │   │   ├── LanguagePicker.tsx
│   │   │   │   ├── OtpInput.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── OtpPage.tsx
│   │   │   │   └── ForgotPasswordPage.tsx
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   ├── student/                STUDENT AREA — /app/*
│   │   │   ├── dashboard/
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProgressSummary.tsx
│   │   │   │   │   ├── UpcomingSteps.tsx
│   │   │   │   │   └── QuickActions.tsx
│   │   │   │   └── pages/DashboardPage.tsx
│   │   │   ├── courses/
│   │   │   │   ├── components/
│   │   │   │   │   ├── PhaseCard.tsx
│   │   │   │   │   ├── TopicList.tsx
│   │   │   │   │   ├── VideoPlayer.tsx     Wraps NoSkipVideoPlayer
│   │   │   │   │   ├── QuizScreen.tsx
│   │   │   │   │   └── ProgressBar.tsx
│   │   │   │   └── pages/
│   │   │   │       ├── PhasesListPage.tsx
│   │   │   │       ├── PhaseDetailPage.tsx
│   │   │   │       ├── TopicDetailPage.tsx
│   │   │   │       └── QuizPage.tsx
│   │   │   ├── checklists/
│   │   │   │   ├── components/
│   │   │   │   │   ├── ChecklistItemRow.tsx
│   │   │   │   │   └── ItemDetailModal.tsx
│   │   │   │   └── pages/
│   │   │   │       ├── BeforeArrivalPage.tsx
│   │   │   │       └── AfterArrivalPage.tsx
│   │   │   ├── payment/
│   │   │   │   ├── components/
│   │   │   │   │   ├── PaymentMethodPicker.tsx
│   │   │   │   │   ├── CardPaymentForm.tsx
│   │   │   │   │   └── BankTransferForm.tsx
│   │   │   │   └── pages/
│   │   │   │       ├── PaymentPage.tsx
│   │   │   │       └── PaymentHistoryPage.tsx
│   │   │   ├── premium-services/
│   │   │   │   └── pages/
│   │   │   │       ├── ServicesListPage.tsx     All-in-One / Personalization tabs
│   │   │   │       └── ServiceDetailPage.tsx
│   │   │   ├── jobs/
│   │   │   │   └── pages/JobsListPage.tsx
│   │   │   ├── certificate/
│   │   │   │   └── pages/CertificatePage.tsx
│   │   │   ├── success-stories/
│   │   │   │   └── pages/SuccessStoriesPage.tsx
│   │   │   └── profile/
│   │   │       └── pages/ProfilePage.tsx
│   │   └── admin/                  ADMIN AREA — /admin/*
│   │       ├── dashboard/
│   │       │   ├── components/
│   │       │   │   ├── StatCard.tsx
│   │       │   │   ├── RevenueChart.tsx
│   │       │   │   └── RecentActivity.tsx
│   │       │   └── pages/AdminDashboardPage.tsx
│   │       ├── students/
│   │       │   ├── components/
│   │       │   │   ├── StudentTable.tsx
│   │       │   │   ├── StudentDetailPanel.tsx
│   │       │   │   ├── StudentProgressCard.tsx
│   │       │   │   └── ImportStudentsDialog.tsx
│   │       │   └── pages/
│   │       │       ├── StudentsListPage.tsx
│   │       │       └── StudentDetailPage.tsx
│   │       ├── courses/
│   │       │   ├── components/
│   │       │   │   ├── PhaseEditor.tsx
│   │       │   │   ├── TopicEditor.tsx
│   │       │   │   ├── VideoUploader.tsx
│   │       │   │   └── QuestionBuilder.tsx
│   │       │   └── pages/
│   │       │       ├── CoursesOverviewPage.tsx
│   │       │       ├── PhaseEditPage.tsx
│   │       │       └── TopicEditPage.tsx
│   │       ├── orders/                          Premium service fulfillment queue
│   │       │   ├── components/
│   │       │   │   ├── OrderQueueTable.tsx
│   │       │   │   └── FulfillOrderDialog.tsx
│   │       │   └── pages/
│   │       │       └── OrdersQueuePage.tsx
│   │       ├── payments/                        Bank transfer verification
│   │       │   ├── components/
│   │       │   │   ├── PendingTransfersTable.tsx
│   │       │   │   └── ReceiptViewer.tsx
│   │       │   └── pages/
│   │       │       └── PaymentsQueuePage.tsx
│   │       ├── checklists/
│   │       │   ├── components/
│   │       │   │   └── ChecklistItemEditor.tsx
│   │       │   └── pages/
│   │       │       ├── BeforeArrivalManagePage.tsx
│   │       │       └── AfterArrivalManagePage.tsx
│   │       ├── jobs/
│   │       │   ├── components/JobEditor.tsx
│   │       │   └── pages/JobsManagePage.tsx
│   │       ├── success-stories/
│   │       │   └── pages/SuccessStoriesManagePage.tsx
│   │       ├── notifications/
│   │       │   └── pages/SendNotificationPage.tsx
│   │       ├── accounts/                        Income + Expenses
│   │       │   ├── components/
│   │       │   │   ├── IncomeTable.tsx
│   │       │   │   ├── ExpenseTable.tsx
│   │       │   │   └── ExpenseEditor.tsx
│   │       │   └── pages/
│   │       │       ├── IncomePage.tsx
│   │       │       ├── ExpensesPage.tsx
│   │       │       └── FinancialReportsPage.tsx
│   │       ├── reports/
│   │       │   └── pages/ReportsPage.tsx
│   │       └── settings/
│   │           └── pages/SettingsPage.tsx        WhatsApp number, video watch %, categories
│   ├── hooks/                      Global custom hooks
│   │   ├── useAuth.ts
│   │   ├── useConfirm.ts
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   └── usePwaInstall.ts
│   ├── lib/
│   │   ├── formatters.ts           formatMoney, formatDate, etc.
│   │   ├── validators.ts           Shared Zod schemas
│   │   ├── i18n.ts                 react-i18next setup
│   │   ├── utils.ts                cn() from shadcn
│   │   └── constants.ts
│   ├── stores/                     Zustand stores
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   └── settingsStore.ts        Language preference, theme
│   ├── types/                      Shared TypeScript types
│   │   ├── api.ts
│   │   ├── student.ts
│   │   ├── course.ts
│   │   └── ...
│   ├── routes/
│   │   ├── router.tsx              Top-level route tree
│   │   ├── guards.tsx              RequireAuth, RequireRole
│   │   └── paths.ts                Route path constants (typed)
│   ├── locales/
│   │   ├── en.json
│   │   └── si.json
│   ├── styles/
│   │   └── globals.css             Tailwind base + custom
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts                  Includes vite-plugin-pwa config
└── components.json                 shadcn/ui config
```

### Route Structure

```
/                                    Landing page               (PublicLayout)
/about                                                         (PublicLayout)
/services                                                      (PublicLayout)
/success-stories                                               (PublicLayout)
/contact                                                       (PublicLayout)

/login                                                         (AuthLayout)
/register                                                      (AuthLayout)
/otp                                                           (AuthLayout)
/forgot-password                                               (AuthLayout)

/app/                                Student dashboard          (StudentLayout, RequireRole=student)
/app/courses
/app/courses/:phaseId
/app/courses/:phaseId/topics/:topicId
/app/courses/:phaseId/topics/:topicId/quiz
/app/checklists/before-arrival
/app/checklists/after-arrival
/app/payment/:orderId
/app/payment/history
/app/premium-services
/app/premium-services/:serviceId
/app/jobs
/app/certificate
/app/success-stories
/app/profile

/admin/                              Admin dashboard            (AdminLayout, RequireRole=admin)
/admin/students
/admin/students/:id
/admin/courses
/admin/courses/phases/:id
/admin/orders                        Premium service fulfillment queue
/admin/payments                      Bank transfer queue
/admin/checklists/before-arrival
/admin/checklists/after-arrival
/admin/jobs
/admin/success-stories
/admin/notifications
/admin/accounts/income
/admin/accounts/expenses
/admin/accounts/reports
/admin/reports
/admin/settings
```

### Web — Adding a New Feature

To add a new feature (e.g. "Announcements") to the student area:
1. Create `src/features/student/announcements/{components,hooks,pages}`.
2. Create `src/api/announcements.api.ts` with typed API functions.
3. Add types to `src/types/announcement.ts`.
4. Register routes in `src/routes/router.tsx` (under `/app/announcements`).
5. Add nav item in `components/layout/StudentBottomNav.tsx` and `StudentTopNav.tsx`.

Same pattern for admin — replace `student` with `admin` and `StudentBottomNav` with `AdminSidebar`.

Never touch other features to add yours. Isolation is the point.

## PWA Configuration Notes

In `vite.config.ts`:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Plan B International',
        short_name: 'Plan B',
        description: 'Your UAE migration companion',
        theme_color: '#1F4E79',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.planb\.com\/api\/v1\/(phases|topics|checklists|success-stories)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'planb-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
});
```

## Docs (`docs/`)

```
docs/
├── SRS_PlanB_International_v1.2.docx    Functional spec (source of truth)
├── Budget_Proposal_PlanB_v1.1.docx      Scope + timeline + cost
├── schema.md                             Database schema documentation
├── api-endpoints.md                      API reference
├── deployment.md                         Server setup guide
├── CHANGELOG.md                          Version-by-version change log
├── admin-user-guide.md                   For Plan B staff after launch
└── design/
    ├── wireframes/                       Figma exports
    ├── color-palette.md
    └── typography.md
```

## Environment Files (Never Committed)

**backend/.env**
```
APP_ENV=local
APP_KEY=base64:...
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=planb
DB_USERNAME=root
DB_PASSWORD=

REDIS_HOST=127.0.0.1
QUEUE_CONNECTION=redis

MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025           # Mailhog

BUNNY_STREAM_LIBRARY_ID=...
BUNNY_STREAM_API_KEY=...
BUNNY_STORAGE_ZONE=...
BUNNY_STORAGE_KEY=...

FIREBASE_PROJECT_ID=...
FIREBASE_CREDENTIALS=storage/app/firebase-credentials.json

PAYHERE_MERCHANT_ID=...
PAYHERE_SECRET=...
PAYHERE_SANDBOX=true

WHATSAPP_CONTACT_NUMBER=+94xxxxxxxxx
```

**web/.env**
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
```

## Extensibility Notes

Even though this is not SaaS, keep future doors open:

1. **Use enums, not magic strings** — `OrderStatus::Pending` beats `'pending'`.
2. **Use polymorphic relations for notifications** — a notification can belong to a Student, Order, Payment, etc. without extra tables.
3. **Keep feature modules independent** — deleting `features/student/premium-services/` should not break the app.
4. **Design the schema so `tenant_id` can be added later** — a single `ALTER TABLE` + Eloquent global scope is much easier than untangling shared data.
5. **Version the API from day one** (`/api/v1/`) — v2 becomes easy if requirements diverge.
6. **The API is UI-agnostic** — a future React Native app will consume the same endpoints.

---

**Last updated:** 13 August 2026.
