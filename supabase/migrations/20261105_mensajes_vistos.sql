-- Notificaciones de mensajes nuevos en el menú.
-- Guarda cuándo abrió cada usuario la página de Mensajes por última vez.
-- "Nuevo" = mensajes recibidos después de esa fecha + solicitudes pendientes.

create table if not exists public.mensajes_vistos (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  visto_en timestamptz not null default now()
);

alter table public.mensajes_vistos enable row level security;

drop policy if exists mensajes_vistos_propios_lectura on public.mensajes_vistos;
create policy mensajes_vistos_propios_lectura on public.mensajes_vistos
  for select to authenticated using ((select auth.uid()) = usuario_id);

drop policy if exists mensajes_vistos_propios_alta on public.mensajes_vistos;
create policy mensajes_vistos_propios_alta on public.mensajes_vistos
  for insert to authenticated with check ((select auth.uid()) = usuario_id);

drop policy if exists mensajes_vistos_propios_cambio on public.mensajes_vistos;
create policy mensajes_vistos_propios_cambio on public.mensajes_vistos
  for update to authenticated using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

grant select, insert, update on public.mensajes_vistos to authenticated;
revoke all on public.mensajes_vistos from anon;

-- Cuenta las novedades del usuario actual. SECURITY INVOKER: respeta las políticas RLS existentes.
create or replace function public.contar_mensajes_nuevos()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select (
    select count(*) from public.mensajes_privados m
    where m.destinatario = (select auth.uid())
      and m.creado_en > coalesce(
        (select v.visto_en from public.mensajes_vistos v where v.usuario_id = (select auth.uid())),
        '-infinity'::timestamptz)
  )::integer + (
    select count(*) from public.solicitudes_mensaje s
    where s.destinatario = (select auth.uid()) and s.estado = 'pendiente'
  )::integer;
$$;

revoke all on function public.contar_mensajes_nuevos() from public, anon;
grant execute on function public.contar_mensajes_nuevos() to authenticated;
