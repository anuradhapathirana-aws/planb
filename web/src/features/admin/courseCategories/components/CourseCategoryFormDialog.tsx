import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, FolderTree, ImageIcon, Languages, Loader2, Shapes, Type, Wallet } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { IconPicker } from '@/components/shared/IconPicker';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { uploadCourseCategoryIcon } from '@/api/courseCategories.api';
import { COURSE_CATEGORY_ICON_GLYPHS } from '@/features/admin/courseCategories/courseCategoryIcons';
import {
  courseCategoryFormSchema,
  ICON_IMAGE_HINT,
  ICON_IMAGE_MAX_BYTES,
  type CourseCategoryFormSchema,
} from '@/features/admin/courseCategories/courseCategorySchema';
import {
  useCreateCourseCategory,
  useDeleteCourseCategoryIcon,
  useUpdateCourseCategory,
  useUploadCourseCategoryIcon,
} from '@/features/admin/courseCategories/hooks/useCourseCategories';
import { applyServerValidationErrors, getValidationErrors } from '@shared/lib/serverErrors';
import { COURSE_CATEGORY_ICONS, type CourseCategory } from '@shared/types/course';

interface CourseCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The category being edited; null/undefined when adding one. */
  category?: CourseCategory | null;
  /** Pre-selects the parent when adding from a parent row's "Add sub-category". */
  defaultParentId?: number | null;
  /** Top-level categories the admin can place this one under. */
  parents: CourseCategory[];
}

const CATEGORY_FIELD_NAMES = Object.keys(courseCategoryFormSchema.shape);

// Radix Select reserves '' for its placeholder, so "no parent" needs a sentinel.
const NO_PARENT = '__none';

const MAIN_SELLING_OPTIONS = [
  { value: 'single', label: 'One by one' },
  { value: 'bundle', label: 'As a bundle' },
] as const;

const SUB_SELLING_OPTIONS = [
  { value: 'inherit', label: 'Follow main' },
  { value: 'single', label: 'One by one' },
  { value: 'bundle', label: 'Own bundle' },
] as const;

export function CourseCategoryFormDialog({
  open,
  onOpenChange,
  category,
  defaultParentId = null,
  parents,
}: CourseCategoryFormDialogProps) {
  const isEditing = !!category;
  const queryClient = useQueryClient();
  const createCategory = useCreateCourseCategory();
  const updateCategory = useUpdateCourseCategory(category?.id ?? 0);
  const uploadIcon = useUploadCourseCategoryIcon(category?.id ?? 0);
  const removeIcon = useDeleteCourseCategoryIcon(category?.id ?? 0);
  const mutation = isEditing ? updateCategory : createCategory;

  /*
   * The icon image. Editing an existing sub-category, it uploads the moment it is
   * picked (like course art). A new one has no id yet, so the file is held here
   * with a local preview and sent once the save returns one.
   */
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [stagedIcon, setStagedIcon] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CourseCategoryFormSchema>({
    resolver: zodResolver(courseCategoryFormSchema) as Resolver<CourseCategoryFormSchema>,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const parentId = useWatch({ control, name: 'parent_id' });
  const sellingMode = useWatch({ control, name: 'selling_mode' });
  const isSubCategory = parentId !== null && parentId !== undefined;
  // A parent that already has children cannot become a child — that would be a third level.
  const hasChildren = (category?.children?.length ?? 0) > 0;

  useEffect(() => {
    if (!open) return;

    reset({
      parent_id: category ? category.parent_id : defaultParentId,
      name: category?.name ?? '',
      name_si: category?.name_si ?? '',
      description: category?.description ?? '',
      icon: category?.icon ?? null,
      // A new sub-category follows its main category; a new main category sells one by one.
      selling_mode: category?.selling_mode ?? (defaultParentId ? 'inherit' : 'single'),
    });
    setIconUrl(category?.icon_image_url ?? null);
    setStagedIcon(null);
    setStagedPreview(null);
  }, [open, category, defaultParentId, reset]);

  // "Follow main" means nothing once this becomes a main category, and the toggle
  // would show no choice at all — fall back to one by one.
  useEffect(() => {
    if (!isSubCategory && sellingMode === 'inherit') setValue('selling_mode', 'single');
  }, [isSubCategory, sellingMode, setValue]);

  // Object URLs are revoked on replace/unmount so repeated picks don't leak them.
  useEffect(() => {
    return () => {
      if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    };
  }, [stagedPreview]);

  const selectIcon = (file: File) => {
    if (isEditing && category?.parent_id) {
      uploadIcon.mutate(file, { onSuccess: (updated) => setIconUrl(updated.icon_image_url) });
      return;
    }
    setStagedIcon(file);
    setStagedPreview(URL.createObjectURL(file));
  };

  const removeSelectedIcon = () => {
    if (stagedIcon) {
      setStagedIcon(null);
      setStagedPreview(null);
      return;
    }
    removeIcon.mutate(undefined, { onSuccess: () => setIconUrl(null) });
  };

  /** Sends a staged icon against the id the save just returned. */
  const uploadStagedIcon = async (saved: CourseCategory) => {
    if (!stagedIcon || saved.parent_id === null) return;

    setIsFinishing(true);
    try {
      await uploadCourseCategoryIcon(saved.id, stagedIcon);
      await queryClient.invalidateQueries({ queryKey: ['course-categories'] });
    } catch (error) {
      const reason = Object.values(getValidationErrors(error) ?? {})[0]?.[0];
      toast.error(reason ?? 'The category was saved, but its icon could not be uploaded.');
    } finally {
      setIsFinishing(false);
    }
  };

  const onSubmit = (values: CourseCategoryFormSchema) => {
    mutation.mutate(
      {
        parent_id: values.parent_id,
        name: values.name,
        // Blank stays blank all the way to the column — null is "not translated yet".
        name_si: values.name_si || null,
        description: values.description || null,
        icon: values.icon,
        // "Follow" means nothing on a main category; the server stores `single` then.
        selling_mode: values.parent_id === null && values.selling_mode === 'inherit' ? 'single' : values.selling_mode,
      },
      {
        onSuccess: async (saved) => {
          await uploadStagedIcon(saved);
          onOpenChange(false);
        },
        onError: (error) => {
          const { unmatched } = applyServerValidationErrors(error, setError, CATEGORY_FIELD_NAMES);
          if (unmatched.length > 0) toast.error(unmatched[0]);
        },
      },
    );
  };

  const busy = mutation.isPending || isFinishing;
  const iconBusy = uploadIcon.isPending || removeIcon.isPending;
  const parentOptions = parents.filter((parent) => parent.id !== category?.id);
  const parent = parents.find((candidate) => candidate.id === parentId);
  // Says what the chosen mode actually does, including what "follow" resolves to right now.
  const sellingHint = (() => {
    if (sellingMode === 'inherit') {
      return parent?.selling_mode === 'bundle'
        ? `Its courses are part of the ${parent.name} bundle.`
        : `Its courses are sold one by one, like ${parent?.name ?? 'the main category'}.`;
    }
    if (sellingMode === 'bundle') {
      return isSubCategory
        ? 'Students buy every paid course in this sub-category together, as its own bundle — separate from the main category. Courses they already own are left out of the price. Free courses stay free.'
        : 'Students buy every paid course in this category — and in sub-categories set to "Follow main" — together. The price is the total of the course prices; courses a student already owns are left out. Free courses stay free.';
    }
    return 'Students buy each course on its own.';
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? isSubCategory
                ? 'Edit sub-category'
                : 'Edit category'
              : isSubCategory
                ? 'Add sub-category'
                : 'Add course category'}
          </DialogTitle>
          <DialogDescription>
            Main categories appear on the student app's Home screen. Sub-categories sit under one, e.g. Migration ›
            UAE. A course can go in either.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1">
            <FieldLabel htmlFor="category-parent" icon={FolderTree}>
              Place under
            </FieldLabel>
            <Controller
              control={control}
              name="parent_id"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : NO_PARENT}
                  // '' is Radix's hidden native <select> echoing back, not a choice — see CourseCategoryFields.
                  onValueChange={(value) => value !== '' && field.onChange(value === NO_PARENT ? null : Number(value))}
                  disabled={busy || hasChildren}
                >
                  <SelectTrigger id="category-parent" className="w-full" aria-invalid={!!errors.parent_id}>
                    <SelectValue placeholder="Select a main category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>None — this is a main category</SelectItem>
                    {parentOptions.length > 0 && <SelectSeparator />}
                    {parentOptions.map((parent) => (
                      <SelectItem key={parent.id} value={String(parent.id)}>
                        {parent.name}
                        {!parent.is_active && <span className="text-muted-foreground"> (inactive)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {hasChildren && (
              <p className="text-xs text-muted-foreground">
                This category has sub-categories, so it has to stay a main category.
              </p>
            )}
            <FieldError message={errors.parent_id?.message} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel htmlFor="category-name" icon={Type} required>
                Name (English)
              </FieldLabel>
              <Input
                id="category-name"
                placeholder={isSubCategory ? 'e.g. UAE' : 'e.g. Migration'}
                aria-invalid={!!errors.name}
                disabled={busy}
                {...register('name')}
              />
              <FieldError message={errors.name?.message} />
            </div>

            {/* Optional: students reading in Sinhala see the English name until this is filled in. */}
            <div className="space-y-1">
              <FieldLabel htmlFor="category-name-si" icon={Languages}>
                Name (Sinhala)
              </FieldLabel>
              <Input
                id="category-name-si"
                placeholder={isSubCategory ? 'උදා. එක්සත් අරාබි එමීර් රාජ්‍යය' : 'උදා. සංක්‍රමණ'}
                aria-invalid={!!errors.name_si}
                disabled={busy}
                {...register('name_si')}
              />
              <FieldError message={errors.name_si?.message} />
            </div>
          </div>

          <div className={isSubCategory ? 'grid gap-3 sm:grid-cols-[1fr_7rem]' : undefined}>
            <div className="space-y-1">
              <FieldLabel htmlFor="category-icon" icon={Shapes}>
                Icon
              </FieldLabel>
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
                    disabled={busy}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                {isSubCategory
                  ? 'Pick an icon, or upload your own image (e.g. a flag). An uploaded image is shown instead of the icon.'
                  : 'Shown on the category tile on the student app. Left empty, the app picks one from the name.'}
              </p>
            </div>

            {/* Uploaded icons are a sub-category feature; main categories use the list. */}
            {isSubCategory && (
              <div className="space-y-1">
                <FieldLabel icon={ImageIcon}>Image</FieldLabel>
                <ImageDropzone
                  url={stagedPreview ?? iconUrl}
                  onSelect={selectIcon}
                  onRemove={removeSelectedIcon}
                  aspect="square"
                  acceptedTypes={['image/png']}
                  maxBytes={ICON_IMAGE_MAX_BYTES}
                  label="Sub-category icon image"
                  busy={iconBusy}
                  disabled={busy}
                />
              </div>
            )}
          </div>
          {isSubCategory && <p className="-mt-2 text-[11px] text-muted-foreground">Image: {ICON_IMAGE_HINT}.</p>}

          {/* Selling: each course is sold one way only — see the hint for what each choice means. */}
          <div className="space-y-1.5 rounded-lg border p-3">
            <FieldLabel icon={Wallet}>How courses are sold</FieldLabel>
            <Controller
              control={control}
              name="selling_mode"
              render={({ field }) => (
                <SegmentedToggle
                  label="How courses are sold"
                  options={isSubCategory ? SUB_SELLING_OPTIONS : MAIN_SELLING_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">{sellingHint}</p>
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="category-description" icon={FileText}>
              Description
            </FieldLabel>
            <Textarea
              id="category-description"
              rows={2}
              placeholder={
                isSubCategory ? 'e.g. Courses for students heading to the UAE' : 'e.g. The full pre-departure learning path'
              }
              aria-invalid={!!errors.description}
              disabled={busy}
              {...register('description')}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <DialogFooter>
            <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {isEditing ? 'Save changes' : isSubCategory ? 'Add sub-category' : 'Add category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
