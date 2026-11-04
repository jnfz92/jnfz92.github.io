-- Planificaciones orientativas generadas por el alumno con su propia clave OpenAI.
-- No se guarda la clave ni el texto enviado a OpenAI.
create table if not exists public.planes_ia_b2 (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  semanas integer not null check (semanas in (4,8,12,16,24)),
  plan jsonb not null,
  actualizado_en timestamptz not null default now()
);
alter table public.planes_ia_b2 enable row level security;
revoke all on public.planes_ia_b2 from anon;
grant select,insert,update,delete on public.planes_ia_b2 to authenticated;
create policy "Cada alumno puede leer su plan IA" on public.planes_ia_b2
 for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "Cada alumno puede crear su plan IA" on public.planes_ia_b2
 for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "Cada alumno puede modificar su plan IA" on public.planes_ia_b2
 for update to authenticated using ((select auth.uid()) = usuario_id)
 with check ((select auth.uid()) = usuario_id);
create policy "Cada alumno puede eliminar su plan IA" on public.planes_ia_b2
 for delete to authenticated using ((select auth.uid()) = usuario_id);
