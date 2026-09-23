import { describe, it, expect } from 'vitest';
import {
  getErrorMessage, getErrorCode, getErrorName, hasErrorCode, errorMessageIncludes,
} from './errors';

describe('getErrorMessage', () => {
  it('reads Error instances', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });
  it('passes strings through', () => {
    expect(getErrorMessage('boom')).toBe('boom');
  });
  it('reads Supabase-shaped errors, which are not Error instances', () => {
    expect(getErrorMessage({ message: 'duplicate key', code: '23505' })).toBe('duplicate key');
  });
  it('never returns [object Object]', () => {
    expect(getErrorMessage({ detail: 'x' })).not.toContain('[object Object]');
  });
  it('survives circular structures', () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    expect(() => getErrorMessage(a)).not.toThrow();
  });
  it('handles null and undefined', () => {
    expect(getErrorMessage(null)).toBe('null');
    expect(getErrorMessage(undefined)).toBe('undefined');
  });
});

describe('getErrorCode / hasErrorCode', () => {
  it('reads a Postgres code', () => {
    expect(getErrorCode({ code: '23505' })).toBe('23505');
    expect(hasErrorCode({ code: '23505' }, '23505')).toBe(true);
  });
  it('is undefined when absent or non-string', () => {
    expect(getErrorCode(new Error('x'))).toBeUndefined();
    expect(getErrorCode({ code: 23505 })).toBeUndefined();
  });
});

describe('getErrorName', () => {
  it('reads AbortError off a real Error', () => {
    const e = new Error('aborted');
    e.name = 'AbortError';
    expect(getErrorName(e)).toBe('AbortError');
  });
});

describe('errorMessageIncludes', () => {
  it('matches within a message', () => {
    expect(errorMessageIncludes(new Error('Failed to fetch'), 'Failed to fetch')).toBe(true);
  });
  it('is case-sensitive, matching the String.includes calls it replaced', () => {
    expect(errorMessageIncludes(new Error('Failed to fetch'), 'failed to fetch')).toBe(false);
  });
  it('does NOT match text outside the message field', () => {
    // Guards the regression risk: getErrorMessage falls back to JSON.stringify,
    // which would otherwise match a needle in an unrelated nested field.
    expect(errorMessageIncludes({ detail: 'Invalid Refresh Token' }, 'Invalid Refresh Token')).toBe(false);
  });
  it('is false rather than throwing when message is absent or not a string', () => {
    expect(errorMessageIncludes({}, 'x')).toBe(false);
    expect(errorMessageIncludes({ message: 42 }, '42')).toBe(false);
    expect(errorMessageIncludes(undefined, 'x')).toBe(false);
  });
});
