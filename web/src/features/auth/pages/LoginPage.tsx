import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { paths } from '@/routes/paths';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) as Resolver<LoginValues> });

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? paths.admin.dashboard;
    return <Navigate to={from} replace />;
  }

  const onSubmit = (values: LoginValues) => {
    setServerError(null);
    login.mutate(values, {
      onSuccess: () => navigate(paths.admin.dashboard, { replace: true }),
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response
            ?.data?.errors?.email?.[0] ??
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not sign in. Please try again.';
        setServerError(message);
      },
    });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-white/5 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="Plan B International" className="size-12 rounded-full object-cover" />
          <div>
            <p className="text-lg font-semibold">Plan B International</p>
            <p className="text-xs text-primary-foreground/70">Academy</p>
          </div>
        </div>

        <div className="relative space-y-4">
          <h1 className="text-3xl font-semibold leading-tight text-balance">
            Beyond Recruitment.
            <br />
            Towards Transformation.
          </h1>
          <p className="max-w-md text-sm text-primary-foreground/70">
            Manage students, courses and career services for candidates preparing for education and
            employment migration to the UAE.
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/50">
          &copy; {new Date().getFullYear()} Plan B International Private Limited.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <img src="/logo.png" alt="Plan B International" className="mx-auto size-14 rounded-full object-cover lg:hidden" />
            <h2 className="text-2xl font-semibold">Admin sign in</h2>
            <p className="text-sm text-muted-foreground">Sign in with your Plan B staff account.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@planbinternational.com"
                  className="pl-9"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending && <Loader2 className="animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
