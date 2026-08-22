import { apiClient } from './client';

export interface UploadMediaResult {
  url: string;
  contentType: string;
  sizeBytes: number;
}

/** Uploads a local file URI (from expo-image-picker) to the shared
 * backend's `POST /media/upload` — same role-agnostic endpoint the Citizen
 * app uses; a municipality officer is a `users` row too. Used for repair
 * progress photos and resolution evidence. */
export async function uploadMedia(uri: string, filename: string, mimeType: string): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);

  const { data } = await apiClient.post<UploadMediaResult>('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
