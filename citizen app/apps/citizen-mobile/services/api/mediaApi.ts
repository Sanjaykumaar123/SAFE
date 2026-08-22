import { apiClient } from './client';

export interface UploadMediaResult {
  url: string;
  contentType: string;
  sizeBytes: number;
}

/** Uploads a local file URI (from expo-camera/expo-image-picker) to
 * `POST /media/upload` — see services/media for the compression step that
 * happens before this is called (section 38). */
export async function uploadMedia(uri: string, filename: string, mimeType: string): Promise<UploadMediaResult> {
  const formData = new FormData();
  // React Native's FormData accepts this file-shaped object; the DOM `File`
  // type doesn't describe it, hence the cast.
  formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);

  const { data } = await apiClient.post<UploadMediaResult>('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
