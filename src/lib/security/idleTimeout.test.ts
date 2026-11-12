import { describe, it, expect } from 'vitest';
import { getIdlePhase, getIdleTimeoutMs, IDLE_WARNING_MS, STAFF_IDLE_TIMEOUT_MS, STUDENT_IDLE_TIMEOUT_MS } from './idleTimeout';

const MIN = 60 * 1000;

describe('getIdleTimeoutMs', () => {
  it('gives students 120 minutes and every other role 30', () => {
    expect(getIdleTimeoutMs('nurse')).toBe(120 * MIN);
    for (const role of ['instructor', 'admin', 'coordinator', 'super_admin', undefined, null]) {
      expect(getIdleTimeoutMs(role)).toBe(30 * MIN);
    }
  });
});

describe('getIdlePhase', () => {
  it('warns during the final two minutes and expires at the limit', () => {
    const t = STUDENT_IDLE_TIMEOUT_MS;
    expect(getIdlePhase(t - IDLE_WARNING_MS - 1, t)).toBe('active');
    expect(getIdlePhase(t - IDLE_WARNING_MS, t)).toBe('warning');
    expect(getIdlePhase(t - 1, t)).toBe('warning');
    expect(getIdlePhase(t, t)).toBe('expired');
  });

  it('expires immediately when the device wakes long after the limit', () => {
    expect(getIdlePhase(10 * STAFF_IDLE_TIMEOUT_MS, STAFF_IDLE_TIMEOUT_MS)).toBe('expired');
  });
});
