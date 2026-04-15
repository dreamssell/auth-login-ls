const API_BASE = 'https://gcjaeoxjhcfeispehmga.supabase.co/functions/v1';
const API_KEY = 'ls_test_LeadSeller2026ProdAuthKey01abc';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
};

export interface VerifyEmailResponse {
  exists: boolean;
  name?: string;
  error?: string;
}

export interface AuthenticateResponse {
  token?: string;
  redirectUrl?: string;
  error?: string;
}

export async function verifyEmail(email: string): Promise<VerifyEmailResponse> {
  const res = await fetch(`${API_BASE}/verify-email`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao verificar identidade.');
  }

  return res.json();
}

export async function authenticate(email: string, password: string): Promise<AuthenticateResponse> {
  const res = await fetch(`${API_BASE}/authenticate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha na autenticação.');
  }

  return res.json();
}
