// Contrato definido em "Integração de Autenticação — Página Externa de Login ↔ Hub Lead Seller" v1.0
const API_BASE = 'https://gcjaeoxjhcfeispehmga.supabase.co/functions/v1';

// Chave pública (anon) do Supabase do Hub — segura para uso no browser.
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjamFlb3hqaGNmZWlzcGVobWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzYxODUsImV4cCI6MjA5MTg1MjE4NX0.lom6HJlDLttIF3iUFkfMKbi41h4lLLj3Ibsc2Bd-RWE';

// API key emitida pelo painel do Hub para este site externo (vai no body, não no header).
const SITE_API_KEY = 'ls_test_LeadSeller2026ProdAuthKey01abc';

const headers = {
  'Content-Type': 'application/json',
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

export interface VerifyEmailResponse {
  exists: boolean;
  name?: string;
  user?: {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    role_label: string;
  };
  error?: string;
}

export interface AuthenticateResponse {
  success?: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  redirectUrl?: string;
  error?: string;
}

export async function verifyEmail(email: string): Promise<VerifyEmailResponse> {
  const res = await fetch(`${API_BASE}/verify-email`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, api_key: SITE_API_KEY }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || 'Erro ao verificar identidade.');
  }

  return data;
}

export async function authenticate(
  email: string,
  password: string
): Promise<AuthenticateResponse> {
  const res = await fetch(`${API_BASE}/authenticate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, api_key: SITE_API_KEY }),
  });

  const data: AuthenticateResponse = await res.json().catch(() => ({} as AuthenticateResponse));

  // Erros de autorização/validação (400/403/500)
  if (!res.ok) {
    throw new Error(data?.error || 'Erro interno do servidor.');
  }

  // Falhas previsíveis: HTTP 200 com success:false
  if (data.success === false || !data.redirectUrl) {
    throw new Error(data?.error || 'Falha na autenticação.');
  }

  return data;
}
