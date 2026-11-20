import { describe, expect, it } from 'vitest';
import { authenticatorDataUserVerified } from './verifiedPasskeySignIn';

const authData = (flags: number) => {
  const bytes = new Uint8Array(37);
  bytes[32] = flags;
  return bytes.buffer;
};

describe('authenticatorDataUserVerified', () => {
  it('detects the user-verified flag', () => {
    expect(authenticatorDataUserVerified(authData(0x05))).toBe(true);
  });

  it('rejects a user-present-only assertion', () => {
    expect(authenticatorDataUserVerified(authData(0x01))).toBe(false);
    expect(authenticatorDataUserVerified(new ArrayBuffer(10))).toBe(false);
  });
});
