import { describe, expect, it } from 'vitest';
import { getMfaRequirement, isMfaSatisfied, MFA_ROLLOUT_DATE } from './mfaPolicy';

const DAY_MS = 24 * 60 * 60 * 1000;
const afterRollout = (days: number) => new Date(MFA_ROLLOUT_DATE.getTime() + days * DAY_MS);

describe('getMfaRequirement', () => {
  it('requires super admins immediately', () => {
    expect(getMfaRequirement({ role: 'super_admin' }, afterRollout(0))).toEqual({ status: 'required' });
  });

  it('gives existing staff a grace period from the rollout date', () => {
    const result = getMfaRequirement({ role: 'instructor', created_at: '2025-01-01T00:00:00Z' }, afterRollout(2.5));
    expect(result).toMatchObject({ status: 'grace', daysLeft: 5 });
    expect(getMfaRequirement({ role: 'coordinator', created_at: '2025-01-01T00:00:00Z' }, afterRollout(7)))
      .toEqual({ status: 'required' });
  });

  it('starts the grace period at account creation for new staff', () => {
    const profile = { role: 'admin', created_at: afterRollout(30).toISOString() };
    expect(getMfaRequirement(profile, afterRollout(36))).toMatchObject({ status: 'grace', daysLeft: 1 });
    expect(getMfaRequirement(profile, afterRollout(37))).toEqual({ status: 'required' });
  });

  it('leaves students, nurses and simulation-only accounts optional', () => {
    expect(getMfaRequirement({ role: 'nurse' }, afterRollout(30))).toEqual({ status: 'optional' });
    expect(getMfaRequirement({ role: 'instructor', simulation_only: true }, afterRollout(30))).toEqual({ status: 'optional' });
    expect(getMfaRequirement(null, afterRollout(30))).toEqual({ status: 'optional' });
  });
});

describe('isMfaSatisfied', () => {
  const passkey = [{ method: 'passkey' }];
  const password = [{ method: 'password' }];

  it('accepts a session that passed the TOTP challenge', () => {
    expect(isMfaSatisfied({ currentLevel: 'aal2', nextLevel: 'aal2', currentAuthenticationMethods: password })).toBe(true);
  });

  it('accepts a passkey sign-in when an authenticator app is set up', () => {
    expect(isMfaSatisfied({ currentLevel: 'aal1', nextLevel: 'aal2', currentAuthenticationMethods: passkey })).toBe(true);
  });

  it('still needs a code after a password sign-in', () => {
    expect(isMfaSatisfied({ currentLevel: 'aal1', nextLevel: 'aal2', currentAuthenticationMethods: password })).toBe(false);
  });

  it('does not let a passkey stand in for setting up the authenticator app', () => {
    expect(isMfaSatisfied({ currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: passkey })).toBe(false);
  });
});
