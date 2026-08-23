import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { industryFormSchema, type IndustryFormSchema } from '@/features/admin/industries/industrySchema';
import { useCreateIndustry, useUpdateIndustry } from '@/features/admin/industries/hooks/useIndustries';
import type { Industry } from '@/types/industry';

interface IndustryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industry?: Industry | null;
}

export function IndustryFormDialog({ open, onOpenChange, industry }: IndustryFormDialogProps) {
  const isEditing = !!industry;
  const createIndustry = useCreateIndustry();
  const updateIndustry = useUpdateIndustry(industry?.id ?? 0);
  const mutation = isEditing ? updateIndustry : createIndustry;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IndustryFormSchema>({
    resolver: zodResolver(industryFormSchema) as Resolver<IndustryFormSchema>,
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: industry?.name ?? '' });
    }
  }, [open, industry, reset]);

  const onSubmit = (values: IndustryFormSchema) => {
    mutation.mutate(values, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit industry' : 'Add industry'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Rename this industry. Its professions stay linked to it.'
              : 'Industries group related professions for the Student form (FR-ADM-012).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Industry name</Label>
            <Input
              id="name"
              className="h-9"
              placeholder="e.g. Hospitality"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {isEditing ? 'Save changes' : 'Add industry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
