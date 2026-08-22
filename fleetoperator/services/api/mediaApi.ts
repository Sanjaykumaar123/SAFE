import { apiClient } from './client';

export interface UploadMediaResult {
  url: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Uploads a local file URI (a captured detection frame) to the shared
 * backend's `POST /media/upload` — same role-agnostic endpoint every
 * SafePath app uses; a fleet operator is a `users` row too. §30 asked for
 * a presigned-URL flow; this backend has none today and nothing else in
 * the ecosystem uses one, so this stays on the existing proxy-upload
 * endpoint (see the backend plan's documented deviation).
 */
export async function uploadMedia(uri: string, filename: string, mimeType: string): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);

  const { data } = await apiClient.post<UploadMediaResult>('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
