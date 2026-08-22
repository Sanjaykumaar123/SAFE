/**
 * Offline report queue (section 34) — "Do not lose a citizen report
 * because of temporary connectivity." If submission fails because the
 * device is offline, the draft (including the local media URI — upload
 * happens when the queue flushes, not before) is persisted to
 * AsyncStorage instead of just showing an error. `useNetworkSync` flushes
 * the queue automatically once connectivity returns.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HazardTypeType } from '@/constants/hazardType';
import type { SeverityType } from '@/constants/severity';
import type { AIAnalysisResult } from '@/types';

const STORAGE_KEY = 'safepath.pendingReports';

export interface QueuedReport {
  queueId: string;
  mediaUri: string;
  mediaType: 'image' | 'video';
  hazardType: HazardTypeType;
  severity: SeverityType;
  description?: string;
  latitude: number;
  longitude: number;
  locationText: string;
  aiAnalysis?: AIAnalysisResult | null;
  clientTimestamp: string;
  queuedAt: string;
}

async function readQueue(): Promise<QueuedReport[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedReport[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedReport[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export const reportQueue = {
  async enqueue(report: Omit<QueuedReport, 'queueId' | 'queuedAt'>): Promise<void> {
    const queue = await readQueue();
    queue.push({ ...report, queueId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, queuedAt: new Date().toISOString() });
    await writeQueue(queue);
  },
  async list(): Promise<QueuedReport[]> {
    return readQueue();
  },
  async remove(queueId: string): Promise<void> {
    const queue = await readQueue();
    await writeQueue(queue.filter((r) => r.queueId !== queueId));
  },
  async count(): Promise<number> {
    return (await readQueue()).length;
  },
};
