import { keysToCamel, keysToSnake } from '../case';

describe('case conversion (backend snake_case <-> mobile camelCase boundary)', () => {
  it('converts snake_case keys to camelCase, recursively', () => {
    const input = { report_code: 'PTH-1042', hazard_type: 'POTHOLE', status_history: [{ changed_by: 'SYSTEM' }] };
    expect(keysToCamel(input)).toEqual({ reportCode: 'PTH-1042', hazardType: 'POTHOLE', statusHistory: [{ changedBy: 'SYSTEM' }] });
  });

  it('converts camelCase keys to snake_case, recursively', () => {
    const input = { hazardType: 'POTHOLE', mediaUrls: ['a', 'b'], aiAnalysis: { boundingBox: { x: 1 } } };
    expect(keysToSnake(input)).toEqual({ hazard_type: 'POTHOLE', media_urls: ['a', 'b'], ai_analysis: { bounding_box: { x: 1 } } });
  });

  it('leaves primitives and null untouched', () => {
    expect(keysToCamel(null)).toBeNull();
    expect(keysToCamel(42)).toBe(42);
    expect(keysToCamel('hello')).toBe('hello');
  });

  it('round-trips a typical report payload', () => {
    const original = { reportCode: 'PTH-1042', locationText: 'Anna Salai' };
    expect(keysToCamel(keysToSnake(original))).toEqual(original);
  });
});
