/**
 * Real-time architecture boundary (section 44). No WebSocket requirement
 * for v1 — `PollingRealtimeService` just re-runs a callback on an
 * interval, which is what the map/home screens use today via TanStack
 * Query's `refetchInterval` + pull-to-refresh. A future
 * `WebSocketRealtimeService` implementing the same interface can replace
 * it (e.g. once Municipality/Admin actions need to push live map updates
 * to citizens) without touching any screen.
 */
export interface RealtimeService {
  subscribe(onUpdate: () => void): () => void; // returns an unsubscribe fn
}

export class PollingRealtimeService implements RealtimeService {
  constructor(private readonly intervalMs: number = 60_000) {}

  subscribe(onUpdate: () => void): () => void {
    const id = setInterval(onUpdate, this.intervalMs);
    return () => clearInterval(id);
  }
}

/** FUTURE INTEGRATION POINT — not implemented. Once the backend exposes a
 * WebSocket endpoint (section 44), implement RealtimeService here using
 * the same subscribe(onUpdate) => unsubscribe shape and swap it in via
 * getRealtimeService() below. No screen changes required. */
export function getRealtimeService(): RealtimeService {
  return new PollingRealtimeService();
}
