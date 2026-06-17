# Schema WebAuthn — Referência para o Hub Lead Seller

> **Aplicar no projeto Supabase do Hub** (`gcjaeoxjhcfeispehmga`), **não** neste projeto.
> Compatível com `@simplewebauthn/server` v10+ e `@simplewebauthn/browser` v10+.

---

## 1. Solicitação ao time do Hub

Por favor, nos enviem o DDL atual de:

```sql
\d+ public.webauthn_credentials
\d+ public.webauthn_challenges
```

Inclua: colunas, tipos, defaults, constraints, índices, triggers, GRANTs e políticas RLS. Precisamos comparar com o esquema de referência abaixo antes de ligar a verificação criptográfica em produção.

---

## 2. Colunas obrigatórias para `@simplewebauthn/server`

A função `verifyRegistrationResponse` retorna `registrationInfo` com estes campos que **precisam ser persistidos** para que `verifyAuthenticationResponse` funcione depois:

| Campo retornado pelo SimpleWebAuthn | Coluna sugerida | Tipo | Por quê é obrigatório |
|---|---|---|---|
| `credentialID` (Uint8Array) | `credential_id` | `bytea` (ou `text` base64url) **UNIQUE** | Lookup no `auth/complete`; lookup no `allowCredentials`/`excludeCredentials`. |
| `credentialPublicKey` (Uint8Array, COSE) | `public_key` | `bytea` | Verificação criptográfica da assinatura. **Sem isso, login é stub.** |
| `counter` (number) | `sign_count` | `bigint NOT NULL DEFAULT 0` | Detecção de clonagem do autenticador. Precisa ser **atualizado a cada login**. |
| `credentialDeviceType` (`singleDevice`/`multiDevice`) | `device_type` | `text` | Saber se é passkey sincronizada (iCloud/Google) vs. atrelada ao dispositivo. |
| `credentialBackedUp` (boolean) | `backed_up` | `boolean NOT NULL DEFAULT false` | Decisões de UX (sincronizada = ok perder o device). |
| `transports` (array) | `transports` | `text[]` | Vai no `allowCredentials.transports` p/ navegador escolher o autenticador certo. |
| `aaguid` | `aaguid` | `uuid` | Identificar fabricante do autenticador (opcional mas recomendado). |
| `attestationFormat` | `attestation_format` | `text` | Auditoria. |
| `userVerified` (último login) | `last_user_verified` | `boolean` | Auditoria. |
| `origin` validado | `origin` | `text` | Auditoria de qual origem cadastrou. |

**Faltando qualquer um destes → a chamada `verifyAuthenticationResponse` vai falhar ou aceitar uma assertion inválida.**

Os 3 campos críticos que costumam estar ausentes em schemas iniciais são: `public_key`, `sign_count` e `transports`.

---

## 3. DDL de referência

```sql
-- =====================================================================
-- 3.1 EXTENSIONS
-- =====================================================================
create extension if not exists pgcrypto;

-- =====================================================================
-- 3.2 webauthn_credentials
-- =====================================================================
create table if not exists public.webauthn_credentials (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,

  -- Identidade da credencial (base64url, igual ao que o navegador devolve)
  credential_id         text        not null unique,

  -- COSE public key. bytea é mais eficiente; se preferir manter base64url use `text`.
  public_key            bytea       not null,

  -- Anti-clonagem. ATUALIZAR a cada login bem-sucedido.
  sign_count            bigint      not null default 0,

  -- Metadados WebAuthn
  transports            text[]      not null default '{}',
  device_type           text        check (device_type in ('singleDevice','multiDevice')),
  backed_up             boolean     not null default false,
  aaguid                uuid,
  attestation_format    text,
  authenticator_attachment text     check (authenticator_attachment in ('platform','cross-platform')),

  -- UX
  friendly_name         text        not null default 'Dispositivo biométrico',

  -- Auditoria
  origin                text,
  rp_id                 text        not null,
  user_agent            text,
  ip                    inet,

  -- Timestamps
  created_at            timestamptz not null default now(),
  last_used_at          timestamptz,
  revoked_at            timestamptz
);

comment on table  public.webauthn_credentials is 'Credenciais WebAuthn (passkeys) cadastradas pelos usuários';
comment on column public.webauthn_credentials.sign_count is 'Counter assinado pelo autenticador; usado para detectar clonagem (sempre crescente).';

-- Índices
create index if not exists webauthn_credentials_user_id_idx
  on public.webauthn_credentials (user_id)
  where revoked_at is null;

create index if not exists webauthn_credentials_user_active_idx
  on public.webauthn_credentials (user_id, last_used_at desc)
  where revoked_at is null;

-- (credential_id já é UNIQUE → índice automático cobre lookup do auth/complete)

-- GRANTs (obrigatório no Supabase Data API)
grant select, insert, update, delete on public.webauthn_credentials to authenticated;
grant all on public.webauthn_credentials to service_role;
-- NÃO conceder a anon. Lookup público é feito pela edge function via service_role.

-- RLS
alter table public.webauthn_credentials enable row level security;

create policy "users read own credentials"
  on public.webauthn_credentials for select
  to authenticated
  using (user_id = auth.uid());

create policy "users rename/revoke own credentials"
  on public.webauthn_credentials for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users delete own credentials"
  on public.webauthn_credentials for delete
  to authenticated
  using (user_id = auth.uid());

-- IMPORTANTE: NÃO criar política de INSERT para `authenticated`.
-- Insert deve ser feito apenas pela edge function `webauthn` com service_role,
-- depois de validar `verifyRegistrationResponse`. Caso contrário, um cliente
-- malicioso poderia inserir uma public_key arbitrária.

-- =====================================================================
-- 3.3 webauthn_challenges
-- =====================================================================
create table if not exists public.webauthn_challenges (
  id              uuid        primary key default gen_random_uuid(),

  -- Em login discoverable o user_id é desconhecido até a assertion chegar.
  user_id         uuid        references auth.users(id) on delete cascade,
  email           text,

  challenge       text        not null,      -- base64url
  type            text        not null check (type in ('registration','authentication')),
  rp_id           text        not null,

  -- TTL: 5 min é o padrão do Hub.
  expires_at      timestamptz not null default (now() + interval '5 minutes'),
  consumed_at     timestamptz,

  ip              inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

-- Índices: lookup por challenge + expurgo por expires_at
create unique index if not exists webauthn_challenges_challenge_idx
  on public.webauthn_challenges (challenge);

create index if not exists webauthn_challenges_expires_idx
  on public.webauthn_challenges (expires_at)
  where consumed_at is null;

create index if not exists webauthn_challenges_user_idx
  on public.webauthn_challenges (user_id, type)
  where consumed_at is null;

-- GRANTs
grant all on public.webauthn_challenges to service_role;
-- Sem grants para `authenticated` ou `anon` — tabela é puramente server-side.

-- RLS (bloqueio total via Data API; só edge function acessa)
alter table public.webauthn_challenges enable row level security;
-- Sem policies = ninguém via Data API. service_role bypassa RLS.

-- =====================================================================
-- 3.4 Limpeza periódica de challenges expirados
-- =====================================================================
create or replace function public.webauthn_cleanup_challenges()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.webauthn_challenges
   where expires_at < now() - interval '1 hour'
      or consumed_at is not null and consumed_at < now() - interval '1 day';
$$;

-- Agendar via pg_cron (se disponível no Hub):
-- select cron.schedule('webauthn-cleanup', '*/15 * * * *',
--   $$ select public.webauthn_cleanup_challenges(); $$);
```

---

## 4. Revisão de segurança (RLS / constraints)

| Risco | Como o schema acima mitiga |
|---|---|
| **Privilege escalation via INSERT direto** (cliente cria credencial sem passar pela edge function) | Não há policy `for insert` em `webauthn_credentials`. Só `service_role` (edge function) insere. |
| **Hijack de credencial alheia** | RLS escopa SELECT/UPDATE/DELETE por `user_id = auth.uid()`; `WITH CHECK` impede UPDATE mover credencial para outro usuário. |
| **Replay de assertion** | `webauthn_challenges` tem `consumed_at`; edge function deve marcar o challenge como consumido antes de aceitar a assertion. `UNIQUE` em `challenge` impede colisão. |
| **Clonagem de autenticador** | `sign_count` precisa ser comparado e atualizado a cada login (`verifyAuthenticationResponse` faz isso, mas você precisa **persistir** o novo counter). |
| **Vazamento de `public_key`** | RLS bloqueia leitura por outros usuários; `anon` não tem grant. |
| **Cadastro pós-comprometimento** | `revoked_at` permite invalidar uma passkey sem deletar (mantém auditoria). Índices parciais ignoram revogadas. |
| **Validação de origem/rpId** | Persistir `origin` e `rp_id` na credencial permite auditoria; o `verifyAuthenticationResponse` valida contra `expectedOrigin`/`expectedRPID` em runtime. |
| **Múltiplos sites (`auth.leadseller.com.br` vs `leadseller.com.br`)** | Se `rp_id` for `leadseller.com.br`, ambos subdomínios validam. **Decida agora** — credenciais cadastradas com um `rp_id` não funcionam em outro. |

---

## 5. Revisão de performance / índices

| Query típica da edge function | Índice que cobre |
|---|---|
| `auth/begin` com email → buscar credenciais ativas do user | `webauthn_credentials_user_id_idx` (parcial onde `revoked_at is null`) |
| `auth/complete` → buscar pelo `credential_id` recebido | UNIQUE em `credential_id` (B-tree automático) |
| `register/begin` → `excludeCredentials` do user | mesmo `user_id_idx` |
| `list` (perfil) ordenado por uso recente | `webauthn_credentials_user_active_idx` |
| Lookup de challenge ativo | UNIQUE em `challenge` |
| Limpeza periódica | `webauthn_challenges_expires_idx` parcial |

Índices parciais (`WHERE revoked_at IS NULL`/`WHERE consumed_at IS NULL`) mantêm tamanho pequeno mesmo com tabela grande.

---

## 6. Checklist do que provavelmente falta no schema atual do Hub

Baseado no fato de a função estar em modo **stub** e o response não devolver sessão:

- [ ] `public_key bytea NOT NULL` — sem isso a verificação criptográfica é impossível.
- [ ] `sign_count bigint` — precisa ser lido e atualizado a cada login.
- [ ] `transports text[]` — exposto no `auth/begin`, então deve estar persistido (ou está sendo hardcoded para `['internal']`?).
- [ ] `aaguid`, `device_type`, `backed_up` — opcionais mas recomendados.
- [ ] `consumed_at` em challenges — evita replay.
- [ ] Política de INSERT **ausente** em `webauthn_credentials` (insert só via service_role).
- [ ] `rp_id` persistido para auditoria multi-domínio.
- [ ] Job de limpeza de challenges expirados (pg_cron ou cron externo).

---

## 7. Mudanças que o time do Hub precisa fazer junto

1. Ligar `@simplewebauthn/server` em `register/complete` (persistir `public_key`, `sign_count`, `transports`, `aaguid`, `device_type`, `backed_up`).
2. Ligar `@simplewebauthn/server` em `auth/complete` (ler `public_key` + `sign_count`, validar, atualizar `sign_count` + `last_used_at`, marcar challenge como `consumed_at = now()`).
3. Devolver `{ success, redirectUrl, session }` no `auth/complete` (mesmo formato do `/authenticate`).
4. Definir `expectedOrigin` allowlist: `['https://auth.leadseller.com.br', 'https://leadseller.com.br', 'https://app.leadseller.com.br']` + domínios de preview/Vercel.
5. Decidir `rp_id` definitivo: `leadseller.com.br` (recomendado, funciona em todos os subdomínios) ou `auth.leadseller.com.br` (mais restrito).
