import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { reportsApi } from '@/services/api/reportsApi';
import { validateAndUpload } from '@/services/media/mediaService';
import { reportQueue } from '@/services/offline/reportQueue';

import { useNetworkStatus } from './useNetworkStatus';

/**
 * Flushes any reports queued while offline (section 34) as soon as
 * connectivity returns. Mounted once near the app root — nothing else
 * needs to know the queue exists.
 */
export function useNetworkSync() {
  const { isOffline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const isFlushingRef = useRef(false);

  useEffect(() => {
    if (isOffline || isFlushingRef.current) return;

    (async () => {
      const pending = await reportQueue.list();
      if (pending.length === 0) return;

      isFlushingRef.current = true;
      for (const queued of pending) {
        try {
          const uploaded = await validateAndUpload(queued.mediaUri, queued.mediaType);
          await reportsApi.create({
            hazardType: queued.hazardType,
            severity: queued.severity,
            description: queued.description,
            latitude: queued.latitude,
            longitude: queued.longitude,
            locationText: queued.locationText,
            mediaUrls: [uploaded.url],
            aiAnalysis: queued.aiAnalysis,
            clientTimestamp: queued.clientTimestamp,
          });
          await reportQueue.remove(queued.queueId);
        } catch {
          // Still offline or the server rejected it — leave it queued and
          // retry on the next reconnect rather than losing the report.
          break;
        }
      }
      isFlushingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    })();
  }, [isOffline, queryClient]);
}
