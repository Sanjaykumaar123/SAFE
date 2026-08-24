import { router } from 'expo-router';
import { useState } from 'react';

import { useCreateReport } from './useCreateReport';
import { validateAndUpload } from '@/services/media/mediaService';
import { toApiError } from '@/services/api/queryClient';
import { reportQueue } from '@/services/offline/reportQueue';
import { useReportStore } from '@/store/reportStore';

/**
 * Orchestrates the final step of the report flow: upload the captured
 * media, then create the report with the draft state + AI result attached,
 * then reset the draft and hand off to success.tsx. Shared by both the
 * "Yes, Submit" quick path and the edited-form submit path (section 21/22).
 *
 * If submission fails because the device is offline, the draft is queued
 * (services/offline/reportQueue.ts) instead of shown as a hard error —
 * section 34: "Do not lose a citizen report because of temporary
 * connectivity." The queue flushes automatically via useNetworkSync once
 * connectivity returns.
 */
export function useSubmitReportFlow() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createReport = useCreateReport();
  const store = useReportStore();

  async function submit() {
    if (!store.media || !store.location) {
      setSubmitError('Missing photo or location. Please start over.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const uploaded = await validateAndUpload(store.media.uri, store.media.type);
      const report = await createReport.mutateAsync({
        hazardType: store.hazardType,
        severity: store.severity,
        description: store.description || undefined,
        latitude: store.location.latitude,
        longitude: store.location.longitude,
        locationText: store.location.locationText,
        mediaUrls: [uploaded.url],
        aiAnalysis: store.aiResult ?? undefined,
        clientTimestamp: store.capturedAt ?? new Date().toISOString(),
      });
      store.reset();
      router.replace({ pathname: '/report/success', params: { reportId: report.id } });
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.isNetworkError) {
        await reportQueue.enqueue({
          mediaUri: store.media.uri,
          mediaType: store.media.type,
          hazardType: store.hazardType,
          severity: store.severity,
          description: store.description || undefined,
          latitude: store.location.latitude,
          longitude: store.location.longitude,
          locationText: store.location.locationText,
          aiAnalysis: store.aiResult,
          clientTimestamp: store.capturedAt ?? new Date().toISOString(),
        });
        store.reset();
        router.replace({ pathname: '/report/success', params: { queued: '1' } });
        return;
      }
      setSubmitError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { submit, isSubmitting, submitError };
}
