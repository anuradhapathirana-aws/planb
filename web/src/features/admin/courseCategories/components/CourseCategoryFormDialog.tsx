import { useEffect } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import { IconPicker } from '@/components/shared/IconPicker';
import { COURSE_CATEGORY_ICON_GLYPHS } from '@/features/admin/courseCategories/courseCategoryIcons';
import {
  courseCategoryFormSchema,
  type CourseCategoryFormSchema,
} from '@/features/admin/courseCategories/courseCategorySchema';
import {
  useCreateCourseCategory,
  useUpdateCourseCategory,
} from '@/features/admin/courseCategories/hooks/useCourseCategories';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { COURSE_CATEGORY_ICONS, type CourseCategory } from '@shared/types/course';

interface CourseCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CourseCategory | null;
}

const CATEGORY_FIELD_NAMES = Object.keys(courseCategoryFormSchema.shape);

export function CourseCategoryFormDialog({ open, onOpenChange, category }: CourseCategoryFormDialogProps) {
  const isEditing = !!category;
  const createCategory = useCreateCourseCategory();
  const updateCategory = useUpdateCourseCategory(category?.id ?? 0);
  const mutation = isEditing ? updateCategory : createCategory;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<CourseCategoryFormSchema>({
    resolver: zodResolver(courseCategoryFormSchema) as Resolver<CourseCategoryFormSchema>,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? '',
        description: category?.description ?? '',
        icon: category?.icon ?? null,
      });
    }
  }, [open, category, reset]);

  const onSubmit = (values: CourseCategoryFormSchema) => {
    mutation.mutate(
      { name: values.name, description: values.description || null, icon: values.icon },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          const { unmatched } = applyServerValidationErrors(error, setError, CATEGORY_FIELD_NAMES);
          if (unmatched.length > 0) toast.error(unmatched[0]);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit category' : 'Add course category'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Rename this category or update what it covers.'
              : 'Categories group courses — pick one first when creating a course.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="category-name" className="text-xs">
              Category name
            </Label>
            <Input
              id="category-name"
              className="h-9"
              placeholder="e.g. UAE Migration Program"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-icon" className="text-xs">
              Icon <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <IconPicker
                  id="category-icon"
                  ariaLabel="Category icon"
                  noneLabel="No icon (guess from name)"
                  options={COURSE_CATEGORY_ICONS}
                  glyphs={COURSE_CATEGORY_ICON_GLYPHS}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={mutation.isPending}
                />
              )}
            />
            {/*
              Says what "no icon" does, because it is not a blank tile: the app picks a
              glyph from the category name, which is right often enough that an admin
              may reasonably leave it — but they should know it is a guess.
            */}
            <p className="text-xs text-muted-foreground">
              Shown on the category tile on the student app's Home screen. Left empty, the app picks one from
              the category name.
            </p>
            {errors.icon && <p className="text-xs text-destructive">{errors.icon.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-description" className="text-xs">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="category-description"
              rows={2}
              placeholder="e.g. The full pre-departure learning path"
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
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
              {isEditing ? 'Save changes' : 'Add category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
