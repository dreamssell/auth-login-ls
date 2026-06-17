// WebAuthn helpers — base64url encoding/decoding + conversion of options
// returned by the Hub (where binary fields are base64url strings) into the
// ArrayBuffer-based shapes required by `navigator.credentials.create/get`.

export function base64urlToBuffer(value: string): ArrayBuffer {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

export function bufferToBase64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface ServerCreationOptions {
  challenge: string;
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  excludeCredentials?: { type: 'public-key'; id: string; transports?: AuthenticatorTransport[] }[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
}

export interface ServerRequestOptions {
  challenge: string;
  rpId: string;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: { type: 'public-key'; id: string; transports?: AuthenticatorTransport[] }[];
}

export function decodeCreationOptions(opts: ServerCreationOptions): PublicKeyCredentialCreationOptions {
  return {
    ...opts,
    challenge: base64urlToBuffer(opts.challenge),
    user: { ...opts.user, id: base64urlToBuffer(opts.user.id) },
    excludeCredentials: opts.excludeCredentials?.map((c) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  } as PublicKeyCredentialCreationOptions;
}

export function decodeRequestOptions(opts: ServerRequestOptions): PublicKeyCredentialRequestOptions {
  return {
    ...opts,
    challenge: base64urlToBuffer(opts.challenge),
    allowCredentials: opts.allowCredentials?.map((c) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  } as PublicKeyCredentialRequestOptions;
}

export function encodeAttestation(cred: PublicKeyCredential) {
  const response = cred.response as AuthenticatorAttestationResponse;
  const transports =
    typeof response.getTransports === 'function' ? response.getTransports() : undefined;
  return {
    id: cred.id,
    rawId: bufferToBase64url(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      attestationObject: bufferToBase64url(response.attestationObject),
      transports,
    },
  };
}

export function encodeAssertion(cred: PublicKeyCredential) {
  const response = cred.response as AuthenticatorAssertionResponse;
  return {
    id: cred.id,
    rawId: bufferToBase64url(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      authenticatorData: bufferToBase64url(response.authenticatorData),
      signature: bufferToBase64url(response.signature),
      userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
    },
  };
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  );
}
