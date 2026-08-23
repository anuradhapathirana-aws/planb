import { useNavigate } from 'react-router-dom';
import { BarChart3, Clock, Plus, ShieldAlert, Upload, UserCheck, Users, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/features/admin/dashboard/components/StatCard';
import { useStudentStats } from '@/features/admin/students/hooks/useStudents';
import { useAuthStore } from '@/stores/authStore';
import { paths } from '@/routes/paths';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading } = useStudentStats();

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening with Plan B International today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total students" value={stats?.total ?? 0} isLoading={isLoading} />
        <StatCard icon={UserCheck} label="Registered" value={stats?.registered ?? 0} isLoading={isLoading} accent="success" />
        <StatCard icon={Clock} label="Pending registration" value={stats?.pending_registration ?? 0} isLoading={isLoading} accent="accent" />
        <StatCard icon={UserX} label="Blocked" value={stats?.blocked ?? 0} isLoading={isLoading} accent="destructive" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => navigate(paths.admin.students)}>
              <Plus /> Add a student
            </Button>
            <Button variant="outline" onClick={() => navigate(paths.admin.students)}>
              <Upload /> Import Student IDs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-muted-foreground" />
              This month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{isLoading ? '—' : stats?.new_this_month}</p>
            <p className="text-sm text-muted-foreground">new students added</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            Revenue &amp; fulfillment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Revenue this month, top-selling premium services, pending order and payment-verification counts will
            appear here once the Payments and Premium Services modules are built.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
