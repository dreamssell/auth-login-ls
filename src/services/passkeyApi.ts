// Cliente para a edge function `webauthn` do Hub Lead Seller.
// Contrato: ações multiplexadas via campo `action` no body.
import {
  decodeCreationOptions,
  decodeRequestOptions,
  encodeAttestation,
  encodeAssertion,
  type ServerCreationOptions,
  type ServerRequestOptions,
} from '@/lib/webauthn';

const WEBAUTHN_URL = 'https://gcjaeoxjhcfeispehmga.functions.supabase.co/webauthn';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjamFlb3hqaGNmZWlzcGVobWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzYxODUsImV4cCI6MjA5MTg1MjE4NX0.lom6HJlDLttIF3iUFkfMKbi41h4lLLj3Ibsc2Bd-RWE';

// rpId precisa bater com o domínio onde a página roda.
// Default: auth.leadseller.com.br (configuração padrão do Hub).
// Permita override por env para preview/Vercel.
const RP_ID =
  (import.meta.env.VITE_PASSKEY_RP_ID as string | undefined) || 'auth.leadseller.com.br';

function buildHeaders(bearer?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${bearer || ANON_KEY}`,
  };
}

async function call<T>(body: Record<string, unknown>, bearer?: string): Promise<T> {
  const res = await fetch(WEBAUTHN_URL, {
    method: 'POST',
    headers: buildHeaders(bearer),
    body: JSON.stringify({ rp_id: RP_ID, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `webauthn ${res.status}`);
    (err as any).status = res.status;
    (err as any).hint = data?.hint;
    throw err;
  }
  return data as T;
}

// =====================================================================
// REGISTRO (precisa de JWT do usuário recém-logado com senha)
// =====================================================================

export async function registerPasskey(params: {
  accessToken: string;
  userId?: string;
  userName: string;
  userDisplayName?: string;
  friendlyName?: string;
}): Promise<void> {
  const begin = await call<{ publicKey: ServerCreationOptions }>(
    {
      action: 'register/begin',
      user_id: params.userId,
      user_name: params.userName,
      user_display_name: params.userDisplayName,
    },
    params.accessToken
  );

  const cred = (await navigator.credentials.create({
    publicKey: decodeCreationOptions(begin.publicKey),
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error('Cadastro de biometria cancelado.');

  await call<{ ok: true }>(
    {
      action: 'register/complete',
      user_id: params.userId,
      friendly_name: params.friendlyName,
      credential: encodeAttestation(cred),
    },
    params.accessToken
  );
}

// =====================================================================
// LOGIN POR BIOMETRIA
// =====================================================================

export interface PasskeyAuthResult {
  success: boolean;
  redirectUrl?: string;
  session?: { access_token: string; refresh_token: string; expires_in?: number };
  // Resposta atual (stub) — verificação criptográfica ainda não ligada no Hub
  stubVerification?: boolean;
  userId?: string;
}

export async function loginWithPasskey(email?: string): Promise<PasskeyAuthResult> {
  const begin = await call<{ publicKey: ServerRequestOptions }>({
    action: 'auth/begin',
    ...(email ? { email } : {}),
  });

  const cred = (await navigator.credentials.get({
    publicKey: decodeRequestOptions(begin.publicKey),
    mediation: 'optional',
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error('Autenticação biométrica cancelada.');

  const result = await call<any>({
    action: 'auth/complete',
    ...(email ? { email } : {}),
    credential: encodeAssertion(cred),
  });

  return {
    success: result.success ?? result.ok ?? false,
    redirectUrl: result.redirectUrl,
    session: result.session,
    stubVerification: result.stub_verification,
    userId: result.user_id,
  };
}
