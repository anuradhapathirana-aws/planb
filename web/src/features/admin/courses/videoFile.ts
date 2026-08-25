import { toast } from 'sonner';
import { ACCEPTED_VIDEO_TYPES, MAX_VIDEO_UPLOAD_MB } from '@/features/admin/courses/courseSchema';

/**
 * Reads a lesson's length from the file itself before it is uploaded. Doing it
 * here means the admin never types a duration by hand, and the server never has
 * to probe a multi-hundred-megabyte file to find out.
 *
 * Resolves null when the browser cannot decode the container — the upload still
 * goes ahead, just without a duration.
 */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = document.createElement('video');

    const finish = (duration: number | null) => {
      URL.revokeObjectURL(objectUrl);
      probe.removeAttribute('src');
      resolve(duration);
    };

    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      finish(Number.isFinite(probe.duration) && probe.duration > 0 ? Math.round(probe.duration) : null);
    };
    probe.onerror = () => finish(null);
    probe.src = objectUrl;
  });
}

/** Mirrors the backend's upload rules so an obviously bad file never leaves the browser. */
export function validateVideoFile(file: File): boolean {
  const looksLikeVideo = ACCEPTED_VIDEO_TYPES.includes(file.type) || /\.(mp4|mov)$/i.test(file.name);

  if (!looksLikeVideo) {
    toast.error('Upload an MP4 or MOV video.');
    return false;
  }

  if (file.size > MAX_VIDEO_UPLOAD_MB * 1024 * 1024) {
    toast.error(`The video must be under ${MAX_VIDEO_UPLOAD_MB} MB.`);
    return false;
  }

  return true;
}
