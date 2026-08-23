import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Camera,
  CreditCard,
  Factory,
  GraduationCap,
  IdCard,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import {
  useStudent,
  useDeleteStudent,
  useDeleteStudentPhoto,
  useToggleBlockStudent,
  useUploadStudentPhoto,
} from '@/features/admin/students/hooks/useStudents';
import { StudentFormDialog } from '@/features/admin/students/components/StudentFormDialog';
import { formatDate, formatDateTime, initials, labelizeVisaStatus } from '@/lib/formatters';
import { paths } from '@/routes/paths';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png'];

export function StudentDetailPage() {
  const { id } = useParams();
  const studentId = Number(id);
  const navigate = useNavigate();
  const { data: student, isLoading } = useStudent(studentId);
  const toggleBlock = useToggleBlockStudent();
  const deleteStudent = useDeleteStudent();
  const uploadPhoto = useUploadStudentPhoto(studentId);
  const deletePhoto = useDeleteStudentPhoto(studentId);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handlePhotoSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast.error('Use a JPG or PNG image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Image must be under 2 MB.');
      return;
    }
    uploadPhoto.mutate(file);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!student) {
    return (
      <EmptyState icon={GraduationCap} title="Student not found" description="This record may have been removed." />
    );
  }

  return (
    <div className="space-y-3">
      <Breadcrumbs
        items={[
          { label: 'Students', href: paths.admin.students },
          { label: student.full_name ?? student.student_id },
        ]}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="group relative">
              <Avatar className="size-14">
                <AvatarImage src={student.profile_photo_url ?? undefined} alt={student.full_name ?? student.student_id} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {initials(student.full_name ?? student.student_id)}
                </AvatarFallback>
              </Avatar>

              {(uploadPhoto.isPending || deletePhoto.isPending) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <Loader2 className="size-4 animate-spin text-white" />
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handlePhotoSelected}
              />
              <button
                type="button"
                title="Change photo"
                onClick={() => photoInputRef.current?.click()}
                className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Camera className="size-3.5" />
              </button>
              {student.profile_photo_url && (
                <button
                  type="button"
                  title="Remove photo"
                  onClick={() => deletePhoto.mutate()}
                  className="absolute -top-1 -right-1 hidden size-5 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground shadow-sm group-hover:flex hover:bg-destructive/90"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold">{student.full_name ?? 'Not registered yet'}</h1>
                <Badge variant={student.is_registered ? 'success' : 'secondary'}>
                  {student.is_registered ? 'Registered' : 'Pending'}
                </Badge>
                {student.is_blocked && <Badge variant="destructive">Blocked</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{student.student_id}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBlockConfirmOpen(true)}>
              {student.is_blocked ? (
                <>
                  <ShieldCheck className="size-3.5" /> Unblock
                </>
              ) : (
                <>
                  <ShieldOff className="size-3.5" /> Block
                </>
              )}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="progress">Course Progress</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="orders">Premium Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-3">
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Contact number" value={student.contact_number} />
              <InfoRow icon={MapPin} label="Address" value={student.address} />
              <InfoRow icon={CalendarDays} label="Date of birth" value={formatDate(student.date_of_birth)} />
              <InfoRow icon={GraduationCap} label="Highest qualification" value={student.highest_qualification} />
              <InfoRow icon={Factory} label="Industry" value={student.industry?.name} />
              <InfoRow icon={IdCard} label="Profession" value={student.profession?.name} />
              <InfoRow icon={CreditCard} label="Visa status" value={labelizeVisaStatus(student.visa_status)} />
              <InfoRow
                icon={Languages}
                label="Languages spoken"
                value={student.languages_spoken.length > 0 ? student.languages_spoken.join(', ') : null}
              />

              <Separator className="sm:col-span-2" />

              <InfoRow icon={CalendarDays} label="Registered on" value={formatDateTime(student.registered_at)} />
              <InfoRow icon={CalendarDays} label="Record created" value={formatDateTime(student.created_at)} />
              {student.imported_by && <InfoRow icon={CalendarDays} label="Imported by" value={student.imported_by} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-3">
          <EmptyState
            icon={BookOpen}
            title="Course progress — coming soon"
            description="Phase and topic completion, assessment scores and time spent will appear here once the Course Module ships."
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-3">
          <EmptyState
            icon={CreditCard}
            title="Payments — coming soon"
            description="Card payments and bank transfer history will appear here once the Payments module ships."
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-3">
          <EmptyState
            icon={Briefcase}
            title="Premium service orders — coming soon"
            description="Purchased career services and fulfillment status will appear here once the Premium Services module ships."
          />
        </TabsContent>
      </Tabs>

      <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={student} />

      <ConfirmDialog
        open={blockConfirmOpen}
        onOpenChange={setBlockConfirmOpen}
        title={student.is_blocked ? 'Unblock this student?' : 'Block this student?'}
        description={
          student.is_blocked
            ? 'They will regain access to the mobile app.'
            : 'They will lose access to the mobile app immediately.'
        }
        confirmLabel={student.is_blocked ? 'Unblock' : 'Block'}
        variant={student.is_blocked ? 'default' : 'destructive'}
        isLoading={toggleBlock.isPending}
        onConfirm={() =>
          toggleBlock.mutate(
            { id: student.id, block: !student.is_blocked },
            { onSuccess: () => setBlockConfirmOpen(false) },
          )
        }
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this student record?"
        description="This removes the student from the active list. This can be recovered by support if needed."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteStudent.isPending}
        onConfirm={() =>
          deleteStudent.mutate(student.id, {
            onSuccess: () => navigate(paths.admin.students),
          })
        }
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}
