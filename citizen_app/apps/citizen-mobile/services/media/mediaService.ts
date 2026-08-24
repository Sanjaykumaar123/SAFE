/**
 * Media validation + upload orchestration (section 38 — capture -> local
 * ref -> validate type/size -> [compress at capture time via quality] ->
 * upload -> URL). Compression happens at the capture/pick step itself
 * (camera.tsx / image picker both request `quality: 0.7`) rather than a
 * separate re-encode pass, which keeps this module dependency-light.
 */
import { File } from 'expo-file-system';

import { uploadMedia, type UploadMediaResult } from '@/services/api/mediaApi';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

export class MediaValidationError extends Error {}

function mimeTypeForUri(uri: string, kind: 'image' | 'video'): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (kind === 'video') return ext === 'mov' ? 'video/quicktime' : 'video/mp4';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

export async function validateAndUpload(uri: string, kind: 'image' | 'video'): Promise<UploadMediaResult> {
  try {
    const file = new File(uri);
    if (file.exists && file.size > MAX_FILE_SIZE_BYTES) {
      throw new MediaValidationError('This file is too large (max 25MB). Please try a shorter clip or lower quality.');
    }
  } catch (e) {
    if (e instanceof MediaValidationError) throw e;
  }

  const mimeType = mimeTypeForUri(uri, kind);
  const allowed = kind === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  if (!allowed.includes(mimeType)) {
    throw new MediaValidationError('This file type is not supported.');
  }

  const filename = uri.split('/').pop() ?? `capture.${kind === 'image' ? 'jpg' : 'mp4'}`;
  return uploadMedia(uri, filename, mimeType);
}
