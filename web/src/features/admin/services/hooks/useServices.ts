import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createService,
  deleteService,
  deleteServiceThumbnail,
  fetchService,
  fetchServices,
  publishService,
  unpublishService,
  updateService,
  uploadServiceThumbnail,
} from '@/api/services.api';
import { getValidationErrors } from '@shared/lib/serverErrors';
import type { ServiceListFilters, ServicePayload } from '@shared/types/service';

export function useServices(filters: ServiceListFilters) {
  return useQuery({
    queryKey: ['services', filters],
    queryFn: () => fetchServices(filters),
    placeholderData: (previous) => previous,
  });
}

export function useService(id: number | undefined) {
  return useQuery({
    queryKey: ['services', 'detail', id],
    queryFn: () => fetchService(id!),
    enabled: !!id,
  });
}

function useInvalidateServices() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['services'] });
}

export function useCreateService() {
  const invalidate = useInvalidateServices();

  return useMutation({
    mutationFn: (payload: ServicePayload) => createService(payload),
    onSuccess: () => invalidate(),
    // Field-level 422s are rendered under the inputs; only report the rest.
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the service.');
    },
  });
}

export function useUpdateService(id: number) {
  const invalidate = useInvalidateServices();

  return useMutation({
    mutationFn: (payload: ServicePayload) => updateService(id, payload),
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (!getValidationErrors(error)) toast.error('Could not save the service.');
    },
  });
}

export function useDeleteService() {
  const invalidate = useInvalidateServices();

  return useMutation({
    mutationFn: (id: number) => deleteService(id),
    onSuccess: () => {
      invalidate();
      toast.success('Service deleted.');
    },
    onError: () => toast.error('Could not delete the service.'),
  });
}

export function useToggleServicePublished() {
  const invalidate = useInvalidateServices();

  return useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) =>
      publish ? publishService(id) : unpublishService(id),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(variables.publish ? 'Service published.' : 'Service moved back to draft.');
    },
    onError: () => toast.error('Could not change the service status.'),
  });
}

/** Catalogue art. Only usable once the service exists — a new one has no id yet. */
export function useUploadServiceThumbnail(serviceId: number) {
  const invalidate = useInvalidateServices();

  return useMutation({
    mutationFn: (file: File) => uploadServiceThumbnail(serviceId, file),
    onSuccess: () => {
      invalidate();
      toast.success('Thumbnail updated.');
    },
    onError: (error) => {
      const validation = getValidationErrors(error);
      toast.error(validation?.thumbnail?.[0] ?? 'Could not upload the thumbnail.');
    },
  });
}

export function useDeleteServiceThumbnail(serviceId: number) {
  const invalidate = useInvalidateServices();

  return useMutation({
    mutationFn: () => deleteServiceThumbnail(serviceId),
    onSuccess: () => {
      invalidate();
      toast.success('Thumbnail removed.');
    },
    onError: () => toast.error('Could not remove the thumbnail.'),
  });
}
