import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarDays,
  CreditCard,
  Factory,
  GraduationCap,
  IdCard,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UploadCloud,
  User,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection } from '@/components/shared/FormSection';
import { FieldLabel, FieldError } from '@/components/shared/FormField';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import {
  latestAllowedDateOfBirth,
  studentFormSchema,
  toDateInputValue,
  type StudentFormSchema,
} from '@/features/admin/students/studentSchema';
import {
  useCreateStudent,
  useDeleteStudentPhoto,
  useNextStudentId,
  useUpdateStudent,
  useUploadStudentPhoto,
} from '@/features/admin/students/hooks/useStudents';
import { uploadStudentPhoto as uploadStudentPhotoApi } from '@/api/students.api';
import { useActiveIndustries } from '@/features/admin/industries/hooks/useIndustries';
import { useActiveProfessionsByIndustry } from '@/features/admin/professions/hooks/useProfessions';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { cn } from '@/lib/utils';
import type { Student } from '@shared/types/student';

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png'];

// Caps the native date picker at the 18-years-ago cutoff. Module scope: the dialog
// is short-lived, so a date rolling over mid-session isn't a concern.
const MAX_DATE_OF_BIRTH = toDateInputValue(latestAllowedDateOfBirth());

// Only these names exist as inputs, so only these can carry a server error.
const STUDENT_FIELD_NAMES = Object.keys(studentFormSchema.shape);

const VISA_STATUS_OPTIONS = [
  { value: 'visit', label: 'Visit' },
  { value: 'employment', label: 'Employment' },
] as const;

export function StudentFormDialog({ open, onOpenChange, student }: StudentFormDialogProps) {
  const isEditing = !!student;
  const queryClient = useQueryClient();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent(student?.id ?? 0);
  const uploadPhoto = useUploadStudentPhoto(student?.id ?? 0);
  const deletePhoto = useDeleteStudentPhoto(student?.id ?? 0);
  const nextStudentId = useNextStudentId(open && !isEditing);
  const mutation = isEditing ? updateStudent : createStudent;

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Editing an existing student: photo changes upload immediately (a real ID already exists).
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  // Adding a new student: no ID exists yet, so the picked file is staged and only
  // uploaded once "Add student" creates the record.
  const [stagedPhotoFile, setStagedPhotoFile] = useState<File | null>(null);
  const [stagedPhotoPreview, setStagedPhotoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    watch,
    resetField,
    formState: { errors },
  } = useForm<StudentFormSchema>({
    resolver: zodResolver(studentFormSchema) as Resolver<StudentFormSchema>,
    defaultValues: { student_id: '', visa_status: 'visit' },
    // Validate only when the admin leaves a field — never while they are still
    // typing, so an error can't flicker in mid-entry on a value that isn't finished.
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const watchedFullName = watch('full_name');
  const watchedIndustryId = watch('industry_id');
  const { data: industries, isLoading: industriesLoading } = useActiveIndustries();
  const { data: professions, isLoading: professionsLoading } = useActiveProfessionsByIndustry(watchedIndustryId);

  useEffect(() => {
    if (open) {
      reset(
        student
          ? {
              student_id: student.student_id,
              full_name: student.full_name ?? '',
              email: student.email ?? '',
              contact_number: student.contact_number ?? '',
              address: student.address ?? '',
              date_of_birth: student.date_of_birth ?? '',
              highest_qualification: student.highest_qualification ?? '',
              industry_id: student.industry_id ?? undefined,
              profession_id: student.profession_id ?? undefined,
              visa_status: student.visa_status ?? 'visit',
            }
          : { student_id: '', visa_status: 'visit' },
      );
      setLocalPhotoUrl(student?.profile_photo_url ?? null);
      setStagedPhotoFile(null);
      setStagedPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [open, student, reset]);

  useEffect(() => {
    return () => {
      if (stagedPhotoPreview) URL.revokeObjectURL(stagedPhotoPreview);
    };
  }, [stagedPhotoPreview]);

  const validatePhotoFile = (file: File): boolean => {
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast.error('Use a JPG or PNG image.');
      return false;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Image must be under 2 MB.');
      return false;
    }
    return true;
  };

  const processPhotoFile = (file: File | undefined) => {
    if (!file || !validatePhotoFile(file)) return;

    if (isEditing) {
      uploadPhoto.mutate(file, { onSuccess: (data) => setLocalPhotoUrl(data.profile_photo_url) });
    } else {
      setStagedPhotoFile(file);
      setStagedPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    }
  };

  const handlePhotoSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    processPhotoFile(file);
  };

  const handlePhotoDropped = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    processPhotoFile(e.dataTransfer.files?.[0]);
  };

  const handleRemovePhoto = () => {
    if (isEditing) {
      deletePhoto.mutate(undefined, { onSuccess: () => setLocalPhotoUrl(null) });
    } else {
      setStagedPhotoFile(null);
      setStagedPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  };

  /** Surfaces a failed save under the field the backend rejected. */
  const handleServerError = (error: unknown) => {
    const { unmatched } = applyServerValidationErrors(error, setError, STUDENT_FIELD_NAMES);
    if (unmatched.length > 0) toast.error(unmatched[0]);
  };

  const onSubmit = (values: StudentFormSchema) => {
    const payload = {
      ...values,
      // Only email and highest qualification are optional — everything else is
      // required, so the resolver guarantees those are already non-empty here.
      email: values.email || null,
      highest_qualification: values.highest_qualification || null,
    };

    if (isEditing) {
      updateStudent.mutate(payload, {
        onSuccess: () => onOpenChange(false),
        onError: handleServerError,
      });
      return;
    }

    setIsFinalizing(true);
    createStudent.mutate(payload, {
      onSuccess: async (created) => {
        if (stagedPhotoFile) {
          try {
            await uploadStudentPhotoApi(created.id, stagedPhotoFile);
            queryClient.invalidateQueries({ queryKey: ['students'] });
          } catch {
            toast.error('Student saved, but the photo could not be uploaded. Add it from the student’s profile.');
          }
        }
        setIsFinalizing(false);
        onOpenChange(false);
      },
      onError: (error) => {
        setIsFinalizing(false);
        handleServerError(error);
      },
    });
  };

  const displayPhotoUrl = isEditing ? localPhotoUrl : stagedPhotoPreview;
  const photoBusy = uploadPhoto.isPending || deletePhoto.isPending;
  const busy = mutation.isPending || isFinalizing;
  const displayStudentId = isEditing ? student.student_id : (nextStudentId.data ?? (nextStudentId.isError ? '—' : 'Loading…'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 flex-row items-center gap-2.5 space-y-0 p-4 pb-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-5" />
          </span>
          <div className="space-y-0.5">
            <DialogTitle>{isEditing ? 'Edit student' : 'Add student'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update this student’s record.'
                : 'A Student ID is generated automatically so the candidate can self-register on the mobile app.'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {/* Photo */}
            <FormSection icon={ImageIcon} title="Photo">
              <div className="sm:col-span-2 flex items-center gap-3">
                {/* Circular preview — shows the avatar exactly as it will appear elsewhere. */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'flex size-20 items-center justify-center overflow-hidden rounded-full border',
                      displayPhotoUrl ? 'border-border' : 'border-dashed border-input bg-secondary/40',
                    )}
                  >
                    {displayPhotoUrl ? (
                      <img
                        src={displayPhotoUrl}
                        alt={watchedFullName || 'Student photo'}
                        className="size-full object-cover"
                      />
                    ) : (
                      <User className="size-7 text-muted-foreground/50" />
                    )}
                  </div>
                  {photoBusy && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                      <Loader2 className="size-5 animate-spin text-white" />
                    </div>
                  )}
                  {displayPhotoUrl && !photoBusy && (
                    <button
                      type="button"
                      title="Remove photo"
                      aria-label="Remove photo"
                      onClick={handleRemovePhoto}
                      className="absolute top-0 right-0 flex size-6 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Upload target */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handlePhotoDropped}
                  onClick={() => photoInputRef.current?.click()}
                  className={cn(
                    'flex h-20 flex-1 cursor-pointer items-center gap-2.5 rounded-lg border-2 border-dashed px-3 transition-colors',
                    isDragging ? 'border-primary bg-secondary' : 'border-input hover:bg-secondary/50',
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UploadCloud className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium text-primary">
                        {displayPhotoUrl ? 'Click to replace' : 'Click to upload'}
                      </span>{' '}
                      <span className="text-muted-foreground">or drag and drop</span>
                    </p>
                    <p className="text-xs text-muted-foreground">PNG or JPG, up to 2MB</p>
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handlePhotoSelected}
                  />
                </div>
              </div>
            </FormSection>

            {/* Basic information */}
            <FormSection icon={User} title="Basic information">
              <div className="space-y-1">
                <FieldLabel icon={IdCard}>Student ID</FieldLabel>
                <Input className="bg-muted font-mono text-muted-foreground" readOnly value={displayStudentId} />
                {/* Kept in the form payload for edits; not rendered as a visible input. */}
                <input type="hidden" {...register('student_id')} />
              </div>

              <div className="space-y-1">
                <FieldLabel htmlFor="date_of_birth" icon={CalendarDays} required>Date of birth</FieldLabel>
                <Input
                  id="date_of_birth"
                  type="date"
                  max={MAX_DATE_OF_BIRTH}
                  aria-invalid={!!errors.date_of_birth}
                  {...register('date_of_birth')}
                />
                <FieldError message={errors.date_of_birth?.message} />
              </div>

              <div className="space-y-1">
                <FieldLabel htmlFor="full_name" icon={User} required>Full name</FieldLabel>
                <Input
                  id="full_name"
                  placeholder="e.g. Nimal Perera"
                  aria-invalid={!!errors.full_name}
                  {...register('full_name')}
                />
                <FieldError message={errors.full_name?.message} />
              </div>

              <div className="space-y-1">
                <FieldLabel icon={CreditCard} required>Visa status</FieldLabel>
                <Controller
                  control={control}
                  name="visa_status"
                  render={({ field }) => (
                    <SegmentedToggle
                      label="Visa status"
                      options={VISA_STATUS_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={!!errors.visa_status}
                    />
                  )}
                />
                <FieldError message={errors.visa_status?.message} />
              </div>
            </FormSection>

            {/* Contact details */}
            <FormSection icon={Phone} title="Contact details">
              <div className="space-y-1">
                <FieldLabel htmlFor="email" icon={Mail}>Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                <FieldError message={errors.email?.message} />
              </div>

              <div className="space-y-1">
                <FieldLabel htmlFor="contact_number" icon={Phone} required>Contact number</FieldLabel>
                <Input
                  id="contact_number"
                  placeholder="07XXXXXXXX"
                  aria-invalid={!!errors.contact_number}
                  {...register('contact_number')}
                />
                <FieldError message={errors.contact_number?.message} />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <FieldLabel htmlFor="address" icon={MapPin} required>Address</FieldLabel>
                <Textarea
                  id="address"
                  rows={2}
                  placeholder="Street, city, district"
                  aria-invalid={!!errors.address}
                  {...register('address')}
                />
                <FieldError message={errors.address?.message} />
              </div>
            </FormSection>

            {/* Academic & career */}
            <FormSection icon={GraduationCap} title="Academic & career" columns={3}>
              <div className="space-y-1">
                <FieldLabel htmlFor="highest_qualification" icon={GraduationCap}>Highest qualification</FieldLabel>
                <Input id="highest_qualification" placeholder="e.g. G.C.E. A/L" {...register('highest_qualification')} />
              </div>

              <div className="space-y-1">
                <FieldLabel icon={Factory} required>Industry</FieldLabel>
                <Controller
                  control={control}
                  name="industry_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        resetField('profession_id');
                      }}
                      disabled={industriesLoading}
                    >
                      <SelectTrigger size="default" className="w-full" aria-invalid={!!errors.industry_id}>
                        <SelectValue placeholder={industriesLoading ? 'Loading…' : 'Select an industry'} />
                      </SelectTrigger>
                      <SelectContent>
                        {industries?.map((industry) => (
                          <SelectItem key={industry.id} value={String(industry.id)}>
                            {industry.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.industry_id?.message} />
              </div>

              <div className="space-y-1">
                <FieldLabel icon={IdCard} required>Profession</FieldLabel>
                <Controller
                  control={control}
                  name="profession_id"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={!watchedIndustryId || professionsLoading}
                    >
                      <SelectTrigger size="default" className="w-full" aria-invalid={!!errors.profession_id}>
                        <SelectValue
                          placeholder={
                            !watchedIndustryId ? 'Select an industry first' : professionsLoading ? 'Loading…' : 'Select a profession'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {professions?.map((profession) => (
                          <SelectItem key={profession.id} value={String(profession.id)}>
                            {profession.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.profession_id?.message} />
              </div>
            </FormSection>
          </div>

          <DialogFooter className="shrink-0 p-4 pt-3">
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {isEditing ? 'Save changes' : 'Add student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
