/**
 * Who must use two-factor authentication (TOTP), and when.
 *
 * Super admins must set it up straight away. Staff roles get a grace period
 * that starts at the rollout date or when their account was created, whichever
 * is later. Setting up a passkey does not replace the authenticator app, but once
 * the app is set up a user-verified passkey sign-in is accepted instead of a code.
 */

export const MFA_ROLLOUT_DATE = new Date('2026-11-20T00:00:00Z');
export const MFA_GRACE_DAYS = 7;

const GRACE_ROLES = ['instructor', 'coordinator', 'admin'];
const DAY_MS = 24 * 60 * 60 * 1000;

export type MfaRequirement =
  | { status: 'optional' }
  | { status: 'grace'; deadline: Date; daysLeft: number }
  | { status: 'required' };

interface MfaProfile {
  role?: string | null;
  simulation_only?: boolean | null;
  created_at?: string | null;
}

export function getMfaRequirement(profile: MfaProfile | null | undefined, now: Date = new Date()): MfaRequirement {
  if (!profile || profile.simulation_only === true) return { status: 'optional' };
  if (profile.role === 'super_admin') return { status: 'required' };
  if (!GRACE_ROLES.includes(profile.role ?? '')) return { status: 'optional' };

  const createdAt = profile.created_at ? new Date(profile.created_at) : null;
  const start = createdAt && !Number.isNaN(createdAt.getTime()) && createdAt > MFA_ROLLOUT_DATE
    ? createdAt
    : MFA_ROLLOUT_DATE;
  const deadline = new Date(start.getTime() + MFA_GRACE_DAYS * DAY_MS);

  if (now >= deadline) return { status: 'required' };
  return { status: 'grace', deadline, daysLeft: Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS) };
}

/** Text for the enrollment modal: a grace-period user can postpone, everyone else must enroll or sign out. */
export function mfaEnrollmentCopy(requirement: MfaRequirement): { description: string; cancelLabel?: string } {
  const instructions = 'Scan the QR code with an authenticator app such as Google Authenticator or Authy, then enter the code to confirm.';
  if (requirement.status === 'grace') {
    const days = requirement.daysLeft === 1 ? '1 day' : `${requirement.daysLeft} days`;
    return {
      description: `Two-factor authentication will be required for your account from ${requirement.deadline.toLocaleDateString()} (${days} left). ${instructions}`,
      cancelLabel: 'Remind me later',
    };
  }
  return { description: `Your account requires two-factor authentication. ${instructions}` };
}

interface AssuranceLevel {
  currentLevel: string | null;
  nextLevel: string | null;
  currentAuthenticationMethods: Array<{ method: string } | string>;
}

/**
 * Whether the session can skip the TOTP challenge: it already passed one (aal2), or
 * the user has an authenticator app set up and signed in with a passkey. The app's
 * passkey sign-in requires fingerprint/face/PIN, so the passkey alone is two factors.
 * Supabase still marks such sessions aal1, so anything server-side that checks aal2
 * (e.g. removing an authenticator) will still ask for a code.
 */
export function isMfaSatisfied(aal: AssuranceLevel): boolean {
  if (aal.currentLevel === 'aal2') return true;
  return aal.nextLevel === 'aal2' && aal.currentAuthenticationMethods.some(m => (typeof m === 'string' ? m : m.method) === 'passkey');
}
