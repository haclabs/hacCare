import { describe, expect, it } from 'vitest';
import { formatSessionDuration } from './formatSessionDuration';

describe('formatSessionDuration', () => {
  it('uses the actual Start → Complete time, not the planned length', () => {
    expect(formatSessionDuration('2026-10-28T10:00:00Z', '2026-10-28T10:01:30Z', 120)).toBe('1m');
    expect(formatSessionDuration('2026-10-28T10:00:00Z', '2026-10-28T11:05:00Z', 120)).toBe('1h 5m');
  });

  it('shows "< 1m" for a session completed straight away', () => {
    expect(formatSessionDuration('2026-10-28T10:00:00Z', '2026-10-28T10:00:20Z', 120)).toBe('< 1m');
  });

  it('falls back to the planned length when timestamps are missing', () => {
    expect(formatSessionDuration(null, '2026-10-28T10:00:00Z', 90)).toBe('1h 30m');
    expect(formatSessionDuration(undefined, undefined, null)).toBe('N/A');
  });
});
