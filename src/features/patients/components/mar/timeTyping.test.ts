import { describe, expect, it } from 'vitest';
import { normalizeTimeTyping } from './timeTyping';

/** Simulates typing a string one character at a time into the field. */
function type(keys: string, start = ''): string {
  let value = start;
  for (const key of keys) value = normalizeTimeTyping(value + key, value);
  return value;
}

describe('normalizeTimeTyping', () => {
  it('keeps a single colon when the user types one after the auto-added colon', () => {
    expect(type('20:00')).toBe('20:00');
  });

  it('accepts digits only', () => {
    expect(type('2000')).toBe('20:00');
    expect(type('0830')).toBe('08:30');
  });

  it('lets backspace remove the auto-added colon', () => {
    expect(normalizeTimeTyping('20', '20:')).toBe('20');
  });

  it('clamps hours and minutes', () => {
    expect(type('2599')).toBe('23:59');
  });

  it('ignores extra colons and non-digits', () => {
    expect(normalizeTimeTyping('1::5', '1:')).toBe('1:5');
    expect(normalizeTimeTyping('1a2', '1')).toBe('12:');
  });

  it('handles a pasted value', () => {
    expect(normalizeTimeTyping('14:30', '')).toBe('14:30');
  });
});
