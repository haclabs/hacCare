import { supabase } from '../api/supabase';

type VerifyParams = Parameters<typeof supabase.auth.passkey.verifyAuthentication>[0];
type StartData = NonNullable<Awaited<ReturnType<typeof supabase.auth.passkey.startAuthentication>>['data']>;

// authenticatorData flags byte (after the 32-byte RP ID hash); bit 2 = user verified.
const FLAGS_OFFSET = 32;
const USER_VERIFIED = 0x04;

function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function authenticatorDataUserVerified(authenticatorData: ArrayBuffer): boolean {
  const bytes = new Uint8Array(authenticatorData);
  return bytes.length > FLAGS_OFFSET && (bytes[FLAGS_OFFSET] & USER_VERIFIED) !== 0;
}

function toRequestOptions(options: StartData['options']): PublicKeyCredentialRequestOptions {
  return {
    challenge: base64UrlToBuffer(options.challenge),
    rpId: options.rpId,
    timeout: options.timeout,
    allowCredentials: options.allowCredentials?.map(cred => ({
      id: base64UrlToBuffer(cred.id),
      type: 'public-key' as const,
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    })),
    // Supabase asks for 'preferred'; requiring it means the device must check a
    // fingerprint, face or PIN, so the passkey alone is two factors.
    userVerification: 'required',
  };
}

/**
 * Passkey sign-in that requires user verification. Sessions from it are
 * recorded with amr "passkey", which the MFA policy accepts instead of a TOTP code.
 */
export async function signInWithVerifiedPasskey() {
  const { data: start, error: startError } = await supabase.auth.passkey.startAuthentication();
  if (startError || !start) return { data: null, error: startError ?? new Error('Could not start passkey sign-in') };

  let credential: PublicKeyCredential | null;
  try {
    credential = (await navigator.credentials.get({ publicKey: toRequestOptions(start.options) })) as PublicKeyCredential | null;
  } catch (err) {
    return { data: null, error: err };
  }
  if (!credential) return { data: null, error: new Error('Passkey sign-in was cancelled') };

  const response = credential.response as AuthenticatorAssertionResponse;
  if (!authenticatorDataUserVerified(response.authenticatorData)) {
    return { data: null, error: new Error('Your passkey did not verify you (fingerprint, face or PIN). Please use a passkey that does.') };
  }

  const serialized = {
    id: credential.id,
    rawId: credential.id,
    type: 'public-key',
    response: {
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: (credential.authenticatorAttachment ?? undefined) as AuthenticatorAttachment | undefined,
  } as VerifyParams['credential'];

  return supabase.auth.passkey.verifyAuthentication({ challengeId: start.challenge_id, credential: serialized });
}
