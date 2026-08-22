/**
 * §28/29/79/80 — the local offline queue. A vehicle can spend long stretches
 * without network; road observations (and their evidence photos) must
 * survive that and sync automatically once connectivity returns, without
 * ever uploading the same observation twice.
 *
 * Metadata persists in AsyncStorage (small, JSON, fine for a few hundred
 * queued items); each observation's evidence frame is a JPEG already
 * captured to `expo-file-system`'s document directory by the caller — this
 * module only ever deletes that file after the observation is confirmed
 * `SYNCED`, never before (§80: "Never delete unsynced evidence").
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

import { SYNC_BATCH_SIZE, SYNC_MAX_RETRIES, SYNC_RETRY_BASE_DELAY_MS } from '@/constants/config';
import { SyncStatus, type SyncStatusType } from '@/constants/enums';
import { uploadMedia } from '@/services/api/mediaApi';
import { fleetApi } from '@/services/api/fleetApi';
import type { ObservationCreatePayload } from '@/types/fleet';

const STORAGE_KEY = 'safepath.fleet.observationQueue.v1';

export interface QueuedObservation extends ObservationCreatePayload {
  localImageUri: string | null;
  status: SyncStatusType;
  attempts: number;
  nextRetryAt: number;
  lastError: string | null;
  createdAt: number;
}

type Listener = (queue: QueuedObservation[]) => void;

class ObservationQueue {
  private queue: QueuedObservation[] = [];
  private loaded = false;
  private listeners = new Set<Listener>();
  private flushing = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      this.queue = raw ? (JSON.parse(raw) as QueuedObservation[]) : [];
    } catch {
      this.queue = [];
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    this.listeners.forEach((listener) => listener([...this.queue]));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.ensureLoaded().then(() => listener([...this.queue]));
    return () => this.listeners.delete(listener);
  }

  async getQueue(): Promise<QueuedObservation[]> {
    await this.ensureLoaded();
    return [...this.queue];
  }

  async pendingCount(): Promise<number> {
    await this.ensureLoaded();
    return this.queue.filter((item) => item.status !== SyncStatus.SYNCED).length;
  }

  async enqueue(payload: ObservationCreatePayload, localImageUri: string | null): Promise<void> {
    await this.ensureLoaded();
    this.queue.push({
      ...payload,
      localImageUri,
      status: SyncStatus.QUEUED,
      attempts: 0,
      nextRetryAt: 0,
      lastError: null,
      createdAt: Date.now(),
    });
    await this.persist();
  }

  /** Uploads pending evidence photos, then batches metadata to the
   * backend. Safe to call repeatedly (e.g. on network reconnect, on an app
   * foreground event, or on a periodic timer) — items already `SYNCED` or
   * still cooling down after a failed attempt are skipped. */
  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      await this.ensureLoaded();
      const now = Date.now();

      for (const item of this.queue) {
        if (item.status === SyncStatus.SYNCED) continue;
        if (item.status === SyncStatus.RETRYING && item.nextRetryAt > now) continue;
        if (!item.imageUrl && item.localImageUri) {
          item.status = SyncStatus.UPLOADING;
          await this.persist();
          try {
            const uploaded = await uploadMedia(item.localImageUri, `${item.clientObservationId}.jpg`, 'image/jpeg');
            item.imageUrl = uploaded.url;
          } catch (error) {
            this.markRetry(item, error);
          }
        }
      }
      await this.persist();

      const ready = this.queue.filter((item) => item.status !== SyncStatus.SYNCED && (item.imageUrl || !item.localImageUri) && (item.status !== SyncStatus.RETRYING || item.nextRetryAt <= Date.now()));

      for (let i = 0; i < ready.length; i += SYNC_BATCH_SIZE) {
        const batch = ready.slice(i, i + SYNC_BATCH_SIZE);
        batch.forEach((item) => {
          item.status = SyncStatus.UPLOADING;
        });
        await this.persist();

        try {
          const response = await fleetApi.createObservationsBatch(batch.map(toPayload));
          for (const result of response.results) {
            const item = this.queue.find((q) => q.clientObservationId === result.clientObservationId);
            if (!item) continue;
            if (result.status === 'ACCEPTED' || result.status === 'DUPLICATE') {
              item.status = SyncStatus.SYNCED;
              await this.cleanupLocalImage(item);
            } else {
              this.markRetry(item, new Error(result.message ?? 'Rejected by server.'));
            }
          }
        } catch (error) {
          batch.forEach((item) => this.markRetry(item, error));
        }
        await this.persist();
      }
    } finally {
      this.flushing = false;
    }
  }

  private markRetry(item: QueuedObservation, error: unknown): void {
    item.attempts += 1;
    item.lastError = error instanceof Error ? error.message : 'Sync failed.';
    if (item.attempts >= SYNC_MAX_RETRIES) {
      item.status = SyncStatus.FAILED;
    } else {
      item.status = SyncStatus.RETRYING;
      item.nextRetryAt = Date.now() + SYNC_RETRY_BASE_DELAY_MS * 2 ** (item.attempts - 1);
    }
  }

  private async cleanupLocalImage(item: QueuedObservation): Promise<void> {
    if (!item.localImageUri) return;
    try {
      await FileSystem.deleteAsync(item.localImageUri, { idempotent: true });
    } catch {
      // Best-effort — a leftover synced file just wastes a little storage,
      // never a correctness problem.
    }
    item.localImageUri = null;
  }

  /** Clears only fully-synced entries out of the persisted list so it
   * doesn't grow forever — never touches anything still pending. */
  async pruneSynced(): Promise<void> {
    await this.ensureLoaded();
    this.queue = this.queue.filter((item) => item.status !== SyncStatus.SYNCED);
    await this.persist();
  }
}

function toPayload(item: QueuedObservation): ObservationCreatePayload {
  const { localImageUri: _localImageUri, status: _status, attempts: _attempts, nextRetryAt: _nextRetryAt, lastError: _lastError, createdAt: _createdAt, ...payload } = item;
  return payload;
}

export const observationQueue = new ObservationQueue();
