import { parseAuthError } from './authErrorParser';

interface PasskeyErrorLike {
  name?: string;
  code?: string;
  message?: string;
  cause?: { name?: string };
}

/**
 * Turns a passkey (WebAuthn) error from supabase-js into a message for the user.
 * Browser ceremony failures arrive as a WebAuthnError whose `cause` is the
 * underlying DOMException; server failures arrive as an AuthError with `code`.
 */
export function describePasskeyError(error: unknown): string {
  const err = (error ?? {}) as PasskeyErrorLike;
  const causeName = err.cause?.name ?? err.name;

  if (err.code === 'ERROR_CEREMONY_ABORTED' || causeName === 'NotAllowedError' || causeName === 'AbortError') {
    return 'Passkey request was cancelled or timed out. Please try again.';
  }
  if (err.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
    return 'This device already has a passkey for your account.';
  }
  if (err.code === 'ERROR_INVALID_RP_ID' || err.code === 'ERROR_INVALID_DOMAIN' || causeName === 'SecurityError') {
    return 'Passkeys are not available on this site address.';
  }
  if (err.code === 'webauthn_challenge_expired') {
    return 'The passkey request expired. Please try again.';
  }
  if (causeName === 'NotSupportedError') {
    return 'This browser or device does not support passkeys.';
  }
  return parseAuthError(error);
}

export function browserSupportsPasskeys(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
}
