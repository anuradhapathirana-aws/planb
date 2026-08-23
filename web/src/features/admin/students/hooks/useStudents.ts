import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  blockStudent,
  createStudent,
  deleteStudent,
  deleteStudentPhoto,
  fetchNextStudentId,
  fetchStudent,
  fetchStudents,
  fetchStudentStats,
  importStudents,
  unblockStudent,
  updateStudent,
  uploadStudentPhoto,
} from '@/api/students.api';
import { getValidationErrors } from '@/lib/serverErrors';
import type { StudentFormValues, StudentListFilters } from '@/types/student';

const studentsKey = (filters: StudentListFilters) => ['students', filters] as const;

export function useStudents(filters: StudentListFilters) {
  return useQuery({
    queryKey: studentsKey(filters),
    queryFn: () => fetchStudents(filters),
    placeholderData: (previous) => previous,
  });
}

export function useStudentStats() {
  return useQuery({
    queryKey: ['students', 'stats'],
    queryFn: fetchStudentStats,
  });
}

export function useNextStudentId(enabled: boolean) {
  return useQuery({
    queryKey: ['students', 'next-id'],
    queryFn: fetchNextStudentId,
    enabled,
    staleTime: 0,
  });
}

export function useStudent(id: number) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => fetchStudent(id),
    enabled: Number.isFinite(id),
  });
}

function useInvalidateStudents() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
  };
}

export function useCreateStudent() {
  const invalidate = useInvalidateStudents();

  return useMutation({
    mutationFn: (payload: StudentFormValues) => createStudent(payload),
    onSuccess: (data) => {
      invalidate();
      toast.success(`Student added — ID ${data.student_id}.`);
    },
    onError: (error) => {
      // 422s are surfaced under the offending field by the form; a toast would duplicate them.
      if (!getValidationErrors(error)) toast.error('Could not add student.');
    },
  });
}

export function useUpdateStudent(id: number) {
  const invalidate = useInvalidateStudents();

  return useMutation({
    mutationFn: (payload: StudentFormValues) => updateStudent(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Student updated.');
    },
    onError: (error) => {
      // 422s are surfaced under the offending field by the form; a toast would duplicate them.
      if (!getValidationErrors(error)) toast.error('Could not update student.');
    },
  });
}

export function useDeleteStudent() {
  const invalidate = useInvalidateStudents();

  return useMutation({
    mutationFn: (id: number) => deleteStudent(id),
    onSuccess: () => {
      invalidate();
      toast.success('Student removed.');
    },
    onError: () => toast.error('Could not remove student.'),
  });
}

export function useToggleBlockStudent() {
  const invalidate = useInvalidateStudents();

  return useMutation({
    mutationFn: ({ id, block }: { id: number; block: boolean }) =>
      block ? blockStudent(id) : unblockStudent(id),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(variables.block ? 'Student blocked.' : 'Student unblocked.');
    },
    onError: () => toast.error('Could not update student status.'),
  });
}

export function useUploadStudentPhoto(id: number) {
  const invalidate = useInvalidateStudents();

  return useMutation({
    mutationFn: (file: File) => uploadStudentPhoto(id, file),
    onSuccess: () => {
      invalidate();
      toast.success('Profile photo updated.');
    },
    onError: () => toast.error('Could not upload photo. Use a JPG or PNG under 2 MB.'),
  });
}

export function useDeleteStudentPhoto(id: number) {
  const invalidate = useInvalidateStudents();

  return useMutation({
    mutationFn: () => deleteStudentPhoto(id),
    onSuccess: () => {
      invalidate();
      toast.success('Profile photo removed.');
    },
    onError: () => toast.error('Could not remove photo.'),
  });
}

export function useImportStudents() {
  const invalidate = useInvalidateStudents();

  return useMutation({
    mutationFn: (file: File) => importStudents(file),
    onSuccess: (result) => {
      invalidate();
      if (result.failed > 0) {
        toast.warning(`Imported ${result.imported}, skipped ${result.skipped}, ${result.failed} failed.`);
      } else {
        toast.success(`Imported ${result.imported} student${result.imported === 1 ? '' : 's'}.`);
      }
    },
    onError: () => toast.error('Import failed. Check the file and try again.'),
  });
}
