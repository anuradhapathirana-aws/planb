import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Globe, IdCard, Languages, Loader2, UserRound } from 'lucide-react';
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
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import {
  useCreateTeamMember,
  useUpdateTeamMember,
} from '@/features/admin/website/hooks/useTeamMembers';
import {
  teamMemberFormSchema,
  type TeamMemberFormSchema,
} from '@/features/admin/website/websiteSchema';
import type { TeamMember } from '@shared/types/siteContent';

const FIELD_NAMES = ['name', 'role', 'role_si', 'is_visible'];

interface TeamMemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMember | null;
}

/**
 * Add / edit one team member's wording.
 *
 * A dialog, not a page: three fields and a switch is exactly the size a dialog
 * carries well (CLAUDE.md §8). The photograph is uploaded on the card in
 * `TeamPage` instead, so it goes up against a record that already exists and the
 * admin never has to think about save order.
 */
export function TeamMemberFormDialog({ open, onOpenChange, member }: TeamMemberFormDialogProps) {
  const isEditing = !!member;

  const create = useCreateTeamMember();
  const update = useUpdateTeamMember();
  const mutation = isEditing ? update : create;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<TeamMemberFormSchema>({
    resolver: zodResolver(teamMemberFormSchema) as Resolver<TeamMemberFormSchema>,
    // Never mid-keystroke (CLAUDE.md §8 "Sectioned Admin Forms").
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { name: '', role: '', role_si: '', is_visible: true },
  });

  useEffect(() => {
    if (!open) return;

    reset({
      name: member?.name ?? '',
      role: member?.role ?? '',
      // The stored Sinhala column, never the English fallback — what is in this
      // input is what gets saved back over it.
      role_si: member?.role_si ?? '',
      is_visible: member?.is_visible ?? true,
    });
  }, [open, member, reset]);

  const isVisible = watch('is_visible');

  const onSubmit = (values: TeamMemberFormSchema) => {
    const payload = {
      name: values.name.trim(),
      role: values.role.trim() || null,
      // Blank stays blank all the way to the column — null there is what the
      // public API reads as "fall back to English".
      role_si: values.role_si.trim() || null,
      is_visible: values.is_visible,
    };

    const onError = (error: unknown) => {
      const { applied, unmatched } = applyServerValidationErrors(error, setError, FIELD_NAMES);
      if (unmatched.length > 0) toast.error(unmatched[0]);
      else if (applied > 0) toast.error('Check the highlighted fields and try again.');
    };

    if (isEditing && member) {
      update.mutate(
        { id: member.id, payload },
        { onSuccess: () => onOpenChange(false), onError },
      );

      return;
    }

    create.mutate(payload, { onSuccess: () => onOpenChange(false), onError });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit team member' : 'Add team member'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Their photograph is changed on the card behind this dialog.'
              : 'Add them here, then upload their photograph on the card. Both are needed before they show on the website.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1">
            <FieldLabel htmlFor="member-name" icon={UserRound} required>
              Full name
            </FieldLabel>
            <Input
              id="member-name"
              className="h-9"
              placeholder="e.g. Anuradha Pathirana"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="member-role" icon={IdCard}>
              Job title
            </FieldLabel>
            <Input
              id="member-role"
              className="h-9"
              placeholder="e.g. Founder & Director"
              aria-invalid={!!errors.role}
              {...register('role')}
            />
            <FieldError message={errors.role?.message} />
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="member-role-si" icon={Languages}>
              Job title (Sinhala)
            </FieldLabel>
            <Input
              id="member-role-si"
              className="h-9"
              placeholder="උදා. නිර්මාතෘ සහ අධ්‍යක්ෂ"
              aria-invalid={!!errors.role_si}
              {...register('role_si')}
            />
            <FieldError message={errors.role_si?.message} />
            {/* Names are never translated, only job titles — which is why there
                is no Sinhala field for the name above. */}
            <p className="text-xs text-muted-foreground">
              Optional. Visitors reading in Sinhala see the English title until you add one.
            </p>
          </div>

          <div className="space-y-1">
            <FieldLabel icon={Globe}>Show on the website</FieldLabel>
            <SegmentedToggle
              label="Show this person on the Plan B website"
              value={isVisible ? 'on' : 'off'}
              onChange={(value) => setValue('is_visible', value === 'on', { shouldDirty: true })}
              options={[
                { value: 'off', label: 'Hidden' },
                { value: 'on', label: 'Showing' },
              ]}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {isEditing ? 'Save changes' : 'Add person'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
