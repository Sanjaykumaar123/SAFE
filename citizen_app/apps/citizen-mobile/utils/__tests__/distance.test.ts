import { distanceMeters, formatDistance, formatRelativeTime } from '../distance';

describe('formatDistance', () => {
  it('formats sub-kilometer distances in meters', () => {
    expect(formatDistance(800)).toBe('800m away');
  });

  it('formats kilometer-scale distances with one decimal', () => {
    expect(formatDistance(2100)).toBe('2.1km away');
  });

  it('returns an empty string for null/undefined', () => {
    expect(formatDistance(null)).toBe('');
    expect(formatDistance(undefined)).toBe('');
  });
});

describe('distanceMeters (haversine)', () => {
  it('returns ~0 for identical points', () => {
    const point = { latitude: 13.0827, longitude: 80.2707 };
    expect(distanceMeters(point, point)).toBeLessThan(1);
  });

  it('returns a plausible distance between two known Chennai points', () => {
    // Chennai Central (13.0827, 80.2707) to Velachery (12.9784, 80.2205) — roughly 12-13km.
    const a = { latitude: 13.0827, longitude: 80.2707 };
    const b = { latitude: 12.9784, longitude: 80.2205 };
    const result = distanceMeters(a, b);
    expect(result).toBeGreaterThan(9000);
    expect(result).toBeLessThan(16000);
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for the current instant', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('just now');
  });

  it('formats minutes correctly', () => {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60_000).toISOString();
    expect(formatRelativeTime(fifteenMinutesAgo)).toBe('15m ago');
  });

  it('formats hours correctly', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });
});
