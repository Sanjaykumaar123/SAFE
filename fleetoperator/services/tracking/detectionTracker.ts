/**
 * §10/26 — temporal deduplication. YOLO seeing the same physical pothole
 * across several consecutive frames (92% -> 94% -> 95% -> 93%) must become
 * ONE road observation, not one per frame. This is a lightweight
 * count-and-window tracker, not a real object tracker (see §10's own
 * "possible future: ByteTrack") — sufficient for a single dashcam-style
 * feed where at most one hazard is meaningfully "in view" at a time.
 *
 * §speed-adaptive-detection — `confirmCount`/`windowMs` are mutable (via
 * `setParams`), not the fixed module constants they used to be: at highway
 * speed a hazard is only in frame for a fraction of a second, so the
 * caller (`app/monitoring/active.tsx`) re-tunes these from
 * `resolveMonitoringParams(currentSpeedMps)` as GPS speed changes —
 * fewer confirmations required, inside a tighter window — so a real
 * pothole at 80km/h still finalizes before it's behind the vehicle
 * instead of being seen-but-dropped.
 */
import { AI_CONFIDENCE_THRESHOLD, TRACKING_CONFIRM_COUNT, TRACKING_COOLDOWN_MS, TRACKING_WINDOW_MS } from '@/constants/config';
import type { AIInferenceResult } from '@/types/ai';

export interface FinalizedDetection {
  result: AIInferenceResult;
  streakLength: number;
  bestConfidence: number;
}

interface Streak {
  hazardType: string;
  count: number;
  lastSeenAt: number;
  bestResult: AIInferenceResult;
}

export class DetectionTracker {
  private streak: Streak | null = null;
  private cooldownUntil = 0;
  private confirmCount: number;
  private windowMs: number;

  constructor(confirmCount: number = TRACKING_CONFIRM_COUNT, windowMs: number = TRACKING_WINDOW_MS) {
    this.confirmCount = confirmCount;
    this.windowMs = windowMs;
  }

  /** Re-tune confirmation requirement/window in place (does not clear an
   * in-progress streak — a bucket change mid-streak still finishes against
   * whichever parameters are current when it next crosses the threshold,
   * which is the conservative/safe direction either way it changes). */
  setParams(confirmCount: number, windowMs: number): void {
    this.confirmCount = confirmCount;
    this.windowMs = windowMs;
  }

  /** Feed one inference tick's result. Returns a `FinalizedDetection` the
   * moment a streak crosses the confirmation threshold — the caller should
   * turn that, and only that, into a road observation. Everything else
   * (still accumulating, below confidence threshold, in cooldown) returns
   * `null` and requires no action. */
  feed(result: AIInferenceResult): FinalizedDetection | null {
    const now = Date.now();

    if (!result.detected || result.confidence < AI_CONFIDENCE_THRESHOLD || !result.hazardType) {
      this.maybeExpireStreak(now);
      return null;
    }

    if (now < this.cooldownUntil) {
      return null; // still cooling down after the last finalized observation
    }

    if (this.streak && this.streak.hazardType === result.hazardType && now - this.streak.lastSeenAt <= this.windowMs) {
      this.streak.count += 1;
      this.streak.lastSeenAt = now;
      if (result.confidence > this.streak.bestResult.confidence) {
        this.streak.bestResult = result;
      }
    } else {
      this.streak = { hazardType: result.hazardType, count: 1, lastSeenAt: now, bestResult: result };
    }

    if (this.streak.count >= this.confirmCount) {
      const finalized: FinalizedDetection = {
        result: this.streak.bestResult,
        streakLength: this.streak.count,
        bestConfidence: this.streak.bestResult.confidence,
      };
      this.streak = null;
      this.cooldownUntil = now + TRACKING_COOLDOWN_MS;
      return finalized;
    }

    return null;
  }

  reset(): void {
    this.streak = null;
    this.cooldownUntil = 0;
  }

  private maybeExpireStreak(now: number): void {
    if (this.streak && now - this.streak.lastSeenAt > this.windowMs) {
      this.streak = null;
    }
  }
}
