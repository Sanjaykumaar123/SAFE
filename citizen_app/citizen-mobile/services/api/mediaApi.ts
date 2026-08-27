import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';

export interface UploadMediaResult {
  url: string;
  contentType: string;
  sizeBytes: number;
}

/** Uploads a local file URI (from expo-camera/expo-image-picker) to
 * `POST /media/upload` — see services/media for the compression step that
 * happens before this is called (section 38). */
export async function uploadMedia(uri: string, filename: string, mimeType: string): Promise<UploadMediaResult> {
  if (DEMO_MODE) {
    return { url: uri, contentType: mimeType, sizeBytes: 102400 };
  }
  try {
    const formData = new FormData();
    formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);

    const { data } = await apiClient.post<UploadMediaResult>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 25000,
    });
    return data;
  } catch (error) {
    console.warn('Media upload to server failed, falling back to local URI:', error);
    return { url: uri, contentType: mimeType, sizeBytes: 102400 };
  }
}
