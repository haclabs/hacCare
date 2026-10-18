import { describe, it, expect } from 'vitest';
import { getOrderReleaseStatus, parseReleaseAfterMinutes, formatReleaseDelay, MAX_RELEASE_AFTER_MINUTES } from './orderRelease';

const START = '2026-10-18T14:00:00.000Z';
const at = (iso: string) => new Date(iso);

describe('getOrderReleaseStatus', () => {
  it('treats null, undefined and 0 as immediate', () => {
    expect(getOrderReleaseStatus(null, START)).toEqual({ kind: 'immediate' });
    expect(getOrderReleaseStatus(undefined, START)).toEqual({ kind: 'immediate' });
    expect(getOrderReleaseStatus(0, START)).toEqual({ kind: 'immediate' });
  });

  it('is scheduled when there is no start time (template, or simulation not started)', () => {
    expect(getOrderReleaseStatus(30, null)).toEqual({ kind: 'scheduled', minutes: 30 });
    expect(getOrderReleaseStatus(30, undefined)).toEqual({ kind: 'scheduled', minutes: 30 });
  });

  it('is held before starts_at + delay', () => {
    const status = getOrderReleaseStatus(30, START, at('2026-10-18T14:29:59.000Z'));
    expect(status.kind).toBe('held');
    expect(status.kind === 'held' && status.releaseAt.toISOString()).toBe('2026-10-18T14:30:00.000Z');
  });

  it('is released exactly at starts_at + delay, matching the RLS "<= now()" check', () => {
    expect(getOrderReleaseStatus(30, START, at('2026-10-18T14:30:00.000Z')).kind).toBe('released');
    expect(getOrderReleaseStatus(30, START, at('2026-10-18T15:00:00.000Z')).kind).toBe('released');
  });
});

describe('formatReleaseDelay', () => {
  it('formats minutes and hours', () => {
    expect(formatReleaseDelay(30)).toBe('30 min');
    expect(formatReleaseDelay(60)).toBe('1 h');
    expect(formatReleaseDelay(90)).toBe('1 h 30 min');
    expect(formatReleaseDelay(1440)).toBe('24 h');
  });
});

describe('parseReleaseAfterMinutes', () => {
  it('returns null for blank, zero, negative and non-integer input', () => {
    for (const input of ['', '   ', '0', '-5', '2.5', 'abc']) {
      expect(parseReleaseAfterMinutes(input)).toBeNull();
    }
  });

  it('parses whole minutes', () => {
    expect(parseReleaseAfterMinutes('30')).toBe(30);
    expect(parseReleaseAfterMinutes(' 45 ')).toBe(45);
  });

  it('caps at the database CHECK limit', () => {
    expect(parseReleaseAfterMinutes('99999')).toBe(MAX_RELEASE_AFTER_MINUTES);
  });
});
