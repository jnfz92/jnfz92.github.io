-- Easy English: perfiles y progreso. Seguro para ejecutar varias veces.
-- No elimina ni modifica las tablas de exámenes existentes.
create table if not exists public.perfiles (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 nombre text not null default '' check (char_length(nombre)<=50),
 actualizado_en timestamptz not null default now()
);
create table if not exists public.lecturas (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 articulo_url text not null check (length(articulo_url)<=240 and articulo_url ~ '^post/[a-zA-Z0-9_./-]+[.]html$' and articulo_url !~ '[.][.]'),
 leido_en timestamptz not null default now(),
 primary key(usuario_id,articulo_url)
);
alter table public.perfiles enable row level security;
alter table public.lecturas enable row level security;
grant select,insert,update,delete on public.perfiles,public.lecturas to authenticated;
revoke all on public.perfiles,public.lecturas from anon;
drop policy if exists "Perfil lectura propia" on public.perfiles;
create policy "Perfil lectura propia" on public.perfiles for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "Perfil crear propio" on public.perfiles;
create policy "Perfil crear propio" on public.perfiles for insert to authenticated with check ((select auth.uid()) = usuario_id);
drop policy if exists "Perfil modificar propio" on public.perfiles;
create policy "Perfil modificar propio" on public.perfiles for update to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
drop policy if exists "Perfil borrar propio" on public.perfiles;
create policy "Perfil borrar propio" on public.perfiles for delete to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "Lecturas consultar propias" on public.lecturas;
create policy "Lecturas consultar propias" on public.lecturas for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "Lecturas registrar propias" on public.lecturas;
create policy "Lecturas registrar propias" on public.lecturas for insert to authenticated with check ((select auth.uid()) = usuario_id);
drop policy if exists "Lecturas actualizar propias" on public.lecturas;
create policy "Lecturas actualizar propias" on public.lecturas for update to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
drop policy if exists "Lecturas eliminar propias" on public.lecturas;
create policy "Lecturas eliminar propias" on public.lecturas for delete to authenticated using ((select auth.uid()) = usuario_id);
