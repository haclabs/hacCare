import { describe, it, expect } from 'vitest';
import { describePasskeyError } from './passkeyErrors';

describe('describePasskeyError', () => {
  it('treats a dismissed browser prompt as a cancellation', () => {
    const err = { code: 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY', message: 'The operation either timed out or was not allowed.', cause: { name: 'NotAllowedError' } };
    expect(describePasskeyError(err)).toMatch(/cancelled or timed out/);
  });

  it('explains a duplicate registration on the same device', () => {
    expect(describePasskeyError({ code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED', message: 'x' }))
      .toBe('This device already has a passkey for your account.');
  });

  it('explains a relying party mismatch (wrong site address)', () => {
    expect(describePasskeyError({ code: 'ERROR_INVALID_RP_ID', message: 'x' }))
      .toBe('Passkeys are not available on this site address.');
  });

  it('asks the user to retry when the server challenge expired', () => {
    expect(describePasskeyError({ code: 'webauthn_challenge_expired', message: 'Challenge expired' }))
      .toMatch(/expired/);
  });

  it('falls back to the shared auth error parser for server errors', () => {
    expect(describePasskeyError({ message: 'Failed to fetch' })).not.toMatch(/passkey/i);
    expect(describePasskeyError({ message: 'Passkey not found' })).toBe('Passkey not found');
  });
});
