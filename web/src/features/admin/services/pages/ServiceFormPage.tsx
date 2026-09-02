import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Clock, FileText, Image as ImageIcon, Loader2, Save, Sparkles, Tag, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { FieldError, FieldLabel } from '@/components/shared/FormField';
import { FormSection } from '@/components/shared/FormSection';
import { ImageDropzone } from '@/components/shared/ImageDropzone';
import { PageLoader } from '@/components/shared/PageLoader';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { SegmentedToggle } from '@/components/shared/SegmentedToggle';
import {
  blankService,
  serviceFormSchema,
  DEFAULT_CURRENCY,
  type ServiceFormSchema,
} from '@/features/admin/services/serviceSchema';
import {
  useCreateService,
  useDeleteServiceThumbnail,
  useService,
  useUpdateService,
  useUploadServiceThumbnail,
} from '@/features/admin/services/hooks/useServices';
import { uploadServiceThumbnail } from '@/api/services.api';
import { fromCents, toCents } from '@shared/lib/formatters';
import { applyServerValidationErrors } from '@shared/lib/serverErrors';
import { paths } from '@/routes/paths';
import type { Service, ServicePayload } from '@shared/types/service';

const SERVICE_FIELD_NAMES = Object.keys(serviceFormSchema.shape);

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
] as const;

function toFormValues(service: Service): ServiceFormSchema {
  return {
    name: service.name,
    summary: service.summary ?? '',
    description: service.description ?? '',
    price: fromCents(service.price_cents),
    currency: service.currency || DEFAULT_CURRENCY,
    delivery_time: service.delivery_time ?? '',
    status: service.status,
  };
}

export function ServiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const serviceId = id ? Number(id) : undefined;
  const isEditing = !!serviceId;
  const navigate = useNavigate();

  const { data: service, isLoading } = useService(serviceId);

  const createService = useCreateService();
  const updateService = useUpdateService(serviceId ?? 0);
  const uploadThumbnail = useUploadServiceThumbnail(serviceId ?? 0);
  const removeThumbnail = useDeleteServiceThumbnail(serviceId ?? 0);

  /**
   * On an existing service the image uploads the moment it is picked. On a new
   * one there is no id to attach it to yet, so the file is held here with a
   * local preview and sent once the save returns an id.
   */
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [stagedThumbnail, setStagedThumbnail] = useState<File | null>(null);
  const [stagedThumbnailPreview, setStagedThumbnailPreview] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ServiceFormSchema>({
    resolver: zodResolver(serviceFormSchema) as Resolver<ServiceFormSchema>,
    defaultValues: blankService(),
    // Errors appear when the admin leaves a field, never mid-keystroke (CLAUDE.md §8).
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  // Hydrated once per service, not on every refetch: saving invalidates this
  // query, and re-running the reset would throw away whatever the admin was
  // mid-way through typing.
  const hydratedServiceId = useRef<number | null>(null);

  useEffect(() => {
    if (!service || hydratedServiceId.current === service.id) return;
    hydratedServiceId.current = service.id;

    reset(toFormValues(service));
    setThumbnailUrl(service.thumbnail_url);
  }, [service, reset]);

  // Object URLs are revoked on replace/unmount so a long editing session doesn't leak them.
  useEffect(() => {
    return () => {
      if (stagedThumbnailPreview) URL.revokeObjectURL(stagedThumbnailPreview);
    };
  }, [stagedThumbnailPreview]);

  const busy = createService.isPending || updateService.isPending;
  const thumbnailBusy = uploadThumbnail.isPending || removeThumbnail.isPending;

  const pickThumbnail = (file: File) => {
    if (isEditing) {
      uploadThumbnail.mutate(file, { onSuccess: (updated) => setThumbnailUrl(updated.thumbnail_url) });
      return;
    }

    setStagedThumbnail(file);
    setStagedThumbnailPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const clearThumbnail = () => {
    if (isEditing) {
      removeThumbnail.mutate(undefined, { onSuccess: () => setThumbnailUrl(null) });
      return;
    }

    setStagedThumbnail(null);
    setStagedThumbnailPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  };

  const buildPayload = (values: ServiceFormSchema): ServicePayload => ({
    name: values.name,
    summary: values.summary || null,
    description: values.description || null,
    // Converted here, once, from the decimal the admin typed — a price is never
    // carried as a float (CLAUDE.md §4.11).
    price_cents: toCents(values.price),
    currency: values.currency,
    delivery_time: values.delivery_time || null,
    status: values.status,
  });

  const onSubmit = async (values: ServiceFormSchema) => {
    let saved: Service;

    try {
      const payload = buildPayload(values);
      saved = isEditing ? await updateService.mutateAsync(payload) : await createService.mutateAsync(payload);
    } catch (error) {
      const { applied, unmatched } = applyServerValidationErrors(error, setError, SERVICE_FIELD_NAMES);
      if (unmatched.length > 0) toast.error(unmatched[0]);
      else if (applied > 0) toast.error('Check the highlighted fields and try again.');
      return;
    }

    // Staged only on create — there was no service id to attach it to until now.
    // A failed thumbnail must not read as a failed save, so it reports separately.
    if (stagedThumbnail) {
      try {
        await uploadServiceThumbnail(saved.id, stagedThumbnail);
        setStagedThumbnail(null);
      } catch {
        toast.error('Service saved, but the image could not be uploaded. Add it from the service page.');
        navigate(paths.admin.serviceEdit(saved.id), { replace: true });
        return;
      }
    }

    toast.success(isEditing ? 'Service updated.' : 'Service created.');
    navigate(paths.admin.services);
  };

  if (isEditing && isLoading) return <PageLoader />;

  return (
    <div className="space-y-3">
      <Breadcrumbs
        items={[
          { label: 'Services', href: paths.admin.services },
          { label: isEditing ? (service?.name ?? 'Service') : 'New service' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{isEditing ? 'Edit service' : 'Add service'}</h1>
            <p className="text-sm text-muted-foreground">
              Name it, set the price students pay, then describe what they get.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => navigate(paths.admin.services)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {isEditing ? 'Save changes' : 'Create service'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Details — sticky on desktop so price and status stay visible while
              working down a long description. */}
          <div className="lg:col-span-1">
            <div className="space-y-3 lg:sticky lg:top-4">
              <FormSection icon={Sparkles} title="Service details" columns={2}>
                <div className="space-y-1 sm:col-span-2">
                  <FieldLabel htmlFor="service-name" icon={Tag} required>
                    Service name
                  </FieldLabel>
                  <Input
                    id="service-name"
                    placeholder="e.g. CV Writing"
                    aria-invalid={!!errors.name}
                    disabled={busy}
                    {...register('name')}
                  />
                  <FieldError message={errors.name?.message} />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <FieldLabel htmlFor="service-summary" icon={FileText}>
                    Short summary
                  </FieldLabel>
                  <Textarea
                    id="service-summary"
                    rows={2}
                    placeholder="One line students see on the service card."
                    aria-invalid={!!errors.summary}
                    disabled={busy}
                    {...register('summary')}
                  />
                  <FieldError message={errors.summary?.message} />
                </div>

                <div className="space-y-1">
                  <FieldLabel htmlFor="service-price" icon={Wallet} required>
                    Price ({DEFAULT_CURRENCY})
                  </FieldLabel>
                  <Input
                    id="service-price"
                    inputMode="decimal"
                    placeholder="7500.00"
                    aria-invalid={!!errors.price}
                    disabled={busy}
                    {...register('price')}
                  />
                  <FieldError message={errors.price?.message} />
                </div>

                <div className="space-y-1">
                  <FieldLabel htmlFor="service-delivery" icon={Clock}>
                    Delivery time
                  </FieldLabel>
                  <Input
                    id="service-delivery"
                    placeholder="3-5 working days"
                    aria-invalid={!!errors.delivery_time}
                    disabled={busy}
                    {...register('delivery_time')}
                  />
                  <FieldError message={errors.delivery_time?.message} />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <FieldLabel icon={Sparkles} required>
                    Status
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <SegmentedToggle
                        label="Service status"
                        options={STATUS_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only a published service can be bought. A draft is invisible to students.
                  </p>
                </div>
              </FormSection>

              <FormSection icon={ImageIcon} title="Image" columns={2}>
                <div className="space-y-1 sm:col-span-2">
                  <ImageDropzone
                    label="Service image"
                    url={isEditing ? thumbnailUrl : stagedThumbnailPreview}
                    onSelect={pickThumbnail}
                    onRemove={clearThumbnail}
                    hint="PNG or JPG, up to 2MB · cropped to 16:9"
                    busy={thumbnailBusy}
                    disabled={busy}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isEditing
                      ? 'Shown on the service card in the student app.'
                      : 'Uploads automatically once the service is created.'}
                  </p>
                </div>
              </FormSection>
            </div>
          </div>

          {/* What the student gets — the long description. */}
          <div className="lg:col-span-2">
            <FormSection icon={FileText} title="What the student gets" columns={2}>
              <div className="space-y-1 sm:col-span-2">
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalid={!!errors.description}
                      placeholder="Explain what is included, what you need from the student, and how it is delivered."
                    />
                  )}
                />
                <FieldError message={errors.description?.message} />
              </div>
            </FormSection>
          </div>
        </div>
      </form>
    </div>
  );
}
