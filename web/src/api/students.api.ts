import { apiClient } from '@/api/client';
import type { ApiResource, PaginatedResponse } from '@shared/types/api';
import type {
  ImportResult,
  Student,
  StudentDocumentLink,
  StudentDocumentType,
  StudentFormValues,
  StudentListFilters,
  StudentStats,
} from '@shared/types/student';

export async function fetchStudents(filters: StudentListFilters): Promise<PaginatedResponse<Student>> {
  const params = { ...filters };
  if (params.status === 'all') delete params.status;
  if (params.visa_status === 'all') delete params.visa_status;

  const { data } = await apiClient.get<PaginatedResponse<Student>>('/admin/students', { params });
  return data;
}

export async function fetchStudentStats(): Promise<StudentStats> {
  const { data } = await apiClient.get<ApiResource<StudentStats>>('/admin/students/stats');
  return data.data;
}

export async function fetchNextStudentId(): Promise<string> {
  const { data } = await apiClient.get<ApiResource<{ student_id: string }>>('/admin/students/next-id');
  return data.data.student_id;
}

export async function fetchStudent(id: number): Promise<Student> {
  const { data } = await apiClient.get<ApiResource<Student>>(`/admin/students/${id}`);
  return data.data;
}

export async function createStudent(payload: StudentFormValues): Promise<Student> {
  const { data } = await apiClient.post<ApiResource<Student>>('/admin/students', payload);
  return data.data;
}

export async function updateStudent(id: number, payload: StudentFormValues): Promise<Student> {
  const { data } = await apiClient.put<ApiResource<Student>>(`/admin/students/${id}`, payload);
  return data.data;
}

export async function deleteStudent(id: number): Promise<void> {
  await apiClient.delete(`/admin/students/${id}`);
}

export async function blockStudent(id: number): Promise<Student> {
  const { data } = await apiClient.post<ApiResource<Student>>(`/admin/students/${id}/block`);
  return data.data;
}

export async function unblockStudent(id: number): Promise<Student> {
  const { data } = await apiClient.post<ApiResource<Student>>(`/admin/students/${id}/unblock`);
  return data.data;
}

export async function uploadStudentPhoto(id: number, file: File): Promise<Student> {
  const formData = new FormData();
  formData.append('photo', file);
  const { data } = await apiClient.post<ApiResource<Student>>(`/admin/students/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteStudentPhoto(id: number): Promise<Student> {
  const { data } = await apiClient.delete<ApiResource<Student>>(`/admin/students/${id}/photo`);
  return data.data;
}

/**
 * CV and profile video, uploaded one at a time against a saved record — the same
 * shape as the photo, and for the same reason: a file this size doesn't ride
 * along with the form post, and on create there is no student id to attach it to
 * until the record exists.
 */
export async function uploadStudentCv(id: number, file: File): Promise<Student> {
  const formData = new FormData();
  formData.append('cv', file);
  const { data } = await apiClient.post<ApiResource<Student>>(`/admin/students/${id}/cv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteStudentCv(id: number): Promise<Student> {
  const { data } = await apiClient.delete<ApiResource<Student>>(`/admin/students/${id}/cv`);
  return data.data;
}

export async function uploadStudentProfileVideo(id: number, file: File): Promise<Student> {
  const formData = new FormData();
  formData.append('profile_video', file);
  const { data } = await apiClient.post<ApiResource<Student>>(`/admin/students/${id}/profile-video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteStudentProfileVideo(id: number): Promise<Student> {
  const { data } = await apiClient.delete<ApiResource<Student>>(`/admin/students/${id}/profile-video`);
  return data.data;
}

/** Short-lived signed link. Fetched fresh every time a document is opened, never cached. */
export async function fetchStudentDocumentLink(
  id: number,
  document: StudentDocumentType,
): Promise<StudentDocumentLink> {
  const { data } = await apiClient.get<ApiResource<StudentDocumentLink>>(
    `/admin/students/${id}/documents/${document}/link`,
  );
  return data.data;
}

export async function importStudents(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ApiResource<ImportResult>>('/admin/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
