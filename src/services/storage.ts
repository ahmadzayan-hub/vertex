import { supabase } from '@/utils/supabase';

export const SUBMISSIONS_BUCKET = 'submissions';
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export function validateFile(file: File): { ok: true } | { ok: false; reason: 'size' | 'type' } {
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'size' };
  if (!ALLOWED_MIME.has(file.type)) return { ok: false, reason: 'type' };
  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function pathFor(projectId: string, submissionId: string, fileName: string): string {
  const clean = fileName.replace(/[^\w.-]+/g, '_');
  return `${projectId}/${submissionId}/${clean}`;
}

/** Upload the file into the submissions bucket. Returns the object path. */
export async function uploadSubmissionFile(
  projectId: string,
  submissionId: string,
  file: File
): Promise<string> {
  const path = pathFor(projectId, submissionId, file.name);
  const { error } = await supabase.storage
    .from(SUBMISSIONS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Get a short-lived signed URL for reading a submission file. */
export async function signedUrlFor(path: string, expiresInSeconds = 60 * 5): Promise<string> {
  const { data, error } = await supabase.storage
    .from(SUBMISSIONS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(error.message);
  if (!data?.signedUrl) throw new Error('No signed URL returned');
  return data.signedUrl;
}
