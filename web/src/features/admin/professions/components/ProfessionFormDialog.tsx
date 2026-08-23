import { useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { professionFormSchema, type ProfessionFormSchema } from '@/features/admin/professions/professionSchema';
import { useCreateProfession, useUpdateProfession } from '@/features/admin/professions/hooks/useProfessions';
import { useActiveIndustries } from '@/features/admin/industries/hooks/useIndustries';
import type { Profession } from '@/types/profession';

interface ProfessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profession?: Profession | null;
  /** Preselects the industry when opened from a filtered Professions list. */
  defaultIndustryId?: number | null;
}

export function ProfessionFormDialog({ open, onOpenChange, profession, defaultIndustryId }: ProfessionFormDialogProps) {
  const isEditing = !!profession;
  const createProfession = useCreateProfession();
  const updateProfession = useUpdateProfession(profession?.id ?? 0);
  const mutation = isEditing ? updateProfession : createProfession;
  const { data: industries, isLoading: industriesLoading } = useActiveIndustries();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfessionFormSchema>({
    resolver: zodResolver(professionFormSchema) as Resolver<ProfessionFormSchema>,
  });

  useEffect(() => {
    if (open) {
      reset({
        industry_id: profession?.industry_id ?? defaultIndustryId ?? undefined,
        name: profession?.name ?? '',
      });
    }
  }, [open, profession, defaultIndustryId, reset]);

  const onSubmit = (values: ProfessionFormSchema) => {
    mutation.mutate(values, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit profession' : 'Add profession'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Rename this profession or move it to a different industry.'
              : 'Every profession belongs to an industry, so pick one first.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label className="text-xs">Industry</Label>
            <Controller
              control={control}
              name="industry_id"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={industriesLoading}
                >
                  <SelectTrigger size="sm" className="w-full">
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
            {errors.industry_id && <p className="text-xs text-destructive">{errors.industry_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Profession name</Label>
            <Input
              id="name"
              className="h-9"
              placeholder="e.g. Chef"
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
              {isEditing ? 'Save changes' : 'Add profession'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
