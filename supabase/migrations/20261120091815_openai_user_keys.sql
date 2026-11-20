-- Each account owns one encrypted OpenAI API key. Browser roles have no table privileges.
create table if not exists public.openai_user_keys (
 user_id uuid primary key references auth.users(id) on delete cascade,
 ciphertext text not null,
 iv text not null,
 updated_at timestamptz not null default now(),
 constraint openai_user_keys_ciphertext_nonempty check(length(ciphertext)>0),
 constraint openai_user_keys_iv_nonempty check(length(iv)>0)
);
alter table public.openai_user_keys enable row level security;
revoke all on table public.openai_user_keys from public,anon,authenticated;
grant select,insert,update,delete on table public.openai_user_keys to service_role;
comment on table public.openai_user_keys is 'Per-user OpenAI API keys encrypted with AES-256-GCM in the Edge Function; inaccessible to browser roles.';
comment on column public.openai_user_keys.ciphertext is 'Base64 AES-256-GCM ciphertext; never plaintext.';
comment on column public.openai_user_keys.iv is 'Unique 96-bit nonce for AES-256-GCM; stored separately from ciphertext.';
