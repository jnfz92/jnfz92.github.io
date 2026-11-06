-- Roles, privilegios, cursos y asignación profesor → alumno. Todo muchos a muchos.
-- Aditiva: no modifica tablas existentes. Todas las tablas nuevas tienen RLS.
-- Los roles los asigna solo quien tiene el privilegio roles.gestionar (o el SQL editor / service role).

-- Catálogos
create table if not exists public.roles (
  codigo text primary key,
  descripcion text not null
);

create table if not exists public.permisos (
  codigo text primary key,
  descripcion text not null
);

-- Un rol tiene varios privilegios; un privilegio pertenece a varios roles.
create table if not exists public.roles_permisos (
  rol text not null references public.roles(codigo) on delete cascade,
  permiso text not null references public.permisos(codigo) on delete cascade,
  primary key (rol, permiso)
);

-- Un usuario tiene varios roles; un rol lo tienen varios usuarios.
create table if not exists public.usuarios_roles (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  rol text not null references public.roles(codigo) on delete cascade,
  asignado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  primary key (usuario_id, rol)
);

-- Cursos
create table if not exists public.cursos (
  id bigint generated always as identity primary key,
  nombre text not null check (length(trim(nombre)) > 0),
  descripcion text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Un curso tiene varios profesores; un profesor imparte varios cursos.
create table if not exists public.cursos_profesores (
  curso_id bigint not null references public.cursos(id) on delete cascade,
  profesor_id uuid not null references auth.users(id) on delete cascade,
  primary key (curso_id, profesor_id)
);

-- Un alumno tiene varios profesores en un curso; un profesor tiene varios alumnos.
create table if not exists public.asignaciones_alumno (
  curso_id bigint not null references public.cursos(id) on delete cascade,
  alumno_id uuid not null references auth.users(id) on delete cascade,
  profesor_id uuid not null,
  asignado_en timestamptz not null default now(),
  primary key (curso_id, alumno_id, profesor_id),
  -- Cada asignación exige que el profesor imparta ese curso.
  foreign key (curso_id, profesor_id) references public.cursos_profesores(curso_id, profesor_id) on delete cascade
);

create index if not exists asignaciones_alumno_profesor_idx on public.asignaciones_alumno (profesor_id);
create index if not exists asignaciones_alumno_alumno_idx on public.asignaciones_alumno (alumno_id);
create index if not exists usuarios_roles_rol_idx on public.usuarios_roles (rol);
create index if not exists roles_permisos_permiso_idx on public.roles_permisos (permiso);

-- Datos iniciales: catálogo de roles y privilegios
insert into public.roles (codigo, descripcion) values
  ('superadmin', 'Control total: roles, cursos y acceso a todo'),
  ('admin', 'Administra la academia: cursos y profesores'),
  ('profesor', 'Imparte cursos y asigna alumnos a sus cursos'),
  ('alumno', 'Estudia en uno o varios cursos')
on conflict (codigo) do nothing;

insert into public.permisos (codigo, descripcion) values
  ('cursos.gestionar', 'Crear y editar cursos, asignar profesores y gestionar cualquier asignación'),
  ('asignaciones.gestionar_propias', 'Asignar y retirar alumnos en los cursos que imparte'),
  ('roles.gestionar', 'Asignar y retirar roles a usuarios'),
  ('progreso.ver_alumnos', 'Ver el progreso de los alumnos asignados')
on conflict (codigo) do nothing;

insert into public.roles_permisos (rol, permiso) values
  ('superadmin', 'cursos.gestionar'),
  ('superadmin', 'roles.gestionar'),
  ('superadmin', 'progreso.ver_alumnos'),
  ('admin', 'cursos.gestionar'),
  ('profesor', 'asignaciones.gestionar_propias'),
  ('profesor', 'progreso.ver_alumnos')
on conflict (rol, permiso) do nothing;

-- Funciones de comprobación. SECURITY DEFINER evita recursión de RLS.
create or replace function public.tiene_permiso(p_permiso text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.usuarios_roles ur
    join public.roles_permisos rp on rp.rol = ur.rol
    where ur.usuario_id = (select auth.uid()) and rp.permiso = p_permiso
  )
$$;

create or replace function public.es_profesor_del_curso(p_curso bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cursos_profesores where curso_id = p_curso and profesor_id = (select auth.uid()))
$$;

revoke execute on function public.tiene_permiso(text), public.es_profesor_del_curso(bigint) from public, anon;
grant execute on function public.tiene_permiso(text), public.es_profesor_del_curso(bigint) to authenticated;

alter table public.roles enable row level security;
alter table public.permisos enable row level security;
alter table public.roles_permisos enable row level security;
alter table public.usuarios_roles enable row level security;
alter table public.cursos enable row level security;
alter table public.cursos_profesores enable row level security;
alter table public.asignaciones_alumno enable row level security;

-- Catálogos: legibles para usuarios autenticados; escritura solo por SQL editor / service role.
drop policy if exists roles_leer on public.roles;
create policy roles_leer on public.roles for select to authenticated using (true);
drop policy if exists permisos_leer on public.permisos;
create policy permisos_leer on public.permisos for select to authenticated using (true);
drop policy if exists roles_permisos_leer on public.roles_permisos;
create policy roles_permisos_leer on public.roles_permisos for select to authenticated using (true);

-- usuarios_roles: cada uno ve sus roles; quien gestiona roles ve y cambia todos.
drop policy if exists usuarios_roles_leer on public.usuarios_roles;
create policy usuarios_roles_leer on public.usuarios_roles for select to authenticated
  using ((select auth.uid()) = usuario_id or public.tiene_permiso('roles.gestionar'));
drop policy if exists usuarios_roles_gestionar on public.usuarios_roles;
create policy usuarios_roles_gestionar on public.usuarios_roles for all to authenticated
  using (public.tiene_permiso('roles.gestionar')) with check (public.tiene_permiso('roles.gestionar'));

-- cursos: ven el curso quienes lo gestionan, lo imparten o están asignados en él.
drop policy if exists cursos_leer on public.cursos;
create policy cursos_leer on public.cursos for select to authenticated
  using (public.tiene_permiso('cursos.gestionar')
    or public.es_profesor_del_curso(id)
    or exists (select 1 from public.asignaciones_alumno a where a.curso_id = cursos.id and a.alumno_id = (select auth.uid())));
drop policy if exists cursos_gestionar on public.cursos;
create policy cursos_gestionar on public.cursos for all to authenticated
  using (public.tiene_permiso('cursos.gestionar')) with check (public.tiene_permiso('cursos.gestionar'));

-- cursos_profesores: lo gestiona cursos.gestionar; cada profesor ve sus filas.
drop policy if exists cursos_profesores_leer on public.cursos_profesores;
create policy cursos_profesores_leer on public.cursos_profesores for select to authenticated
  using (public.tiene_permiso('cursos.gestionar') or profesor_id = (select auth.uid()));
drop policy if exists cursos_profesores_gestionar on public.cursos_profesores;
create policy cursos_profesores_gestionar on public.cursos_profesores for all to authenticated
  using (public.tiene_permiso('cursos.gestionar')) with check (public.tiene_permiso('cursos.gestionar'));

-- asignaciones_alumno: el alumno y el profesor ven la fila; asignar exige ser profesor del curso con su privilegio.
drop policy if exists asignaciones_leer on public.asignaciones_alumno;
create policy asignaciones_leer on public.asignaciones_alumno for select to authenticated
  using (public.tiene_permiso('cursos.gestionar') or alumno_id = (select auth.uid()) or profesor_id = (select auth.uid()));
drop policy if exists asignaciones_insertar on public.asignaciones_alumno;
create policy asignaciones_insertar on public.asignaciones_alumno for insert to authenticated
  with check (public.tiene_permiso('cursos.gestionar')
    or (profesor_id = (select auth.uid()) and public.tiene_permiso('asignaciones.gestionar_propias') and public.es_profesor_del_curso(curso_id)));
drop policy if exists asignaciones_actualizar on public.asignaciones_alumno;
create policy asignaciones_actualizar on public.asignaciones_alumno for update to authenticated
  using (public.tiene_permiso('cursos.gestionar')
    or (profesor_id = (select auth.uid()) and public.tiene_permiso('asignaciones.gestionar_propias') and public.es_profesor_del_curso(curso_id)))
  with check (public.tiene_permiso('cursos.gestionar')
    or (profesor_id = (select auth.uid()) and public.tiene_permiso('asignaciones.gestionar_propias') and public.es_profesor_del_curso(curso_id)));
drop policy if exists asignaciones_borrar on public.asignaciones_alumno;
create policy asignaciones_borrar on public.asignaciones_alumno for delete to authenticated
  using (public.tiene_permiso('cursos.gestionar')
    or (profesor_id = (select auth.uid()) and public.tiene_permiso('asignaciones.gestionar_propias') and public.es_profesor_del_curso(curso_id)));

-- Progreso visible para el profesor: solo de los alumnos asignados a él, con el privilegio progreso.ver_alumnos.
-- Son políticas SELECT adicionales; RLS combina las políticas con OR, así que no quitan acceso a nadie.
do $$
declare t text;
begin
  foreach t in array array['resultados','lecturas','progreso_curso','actividad_intentos','actividad_diaria',
                           'actividad_fallos','preguntas_falladas','seguimiento_semanal','perfiles','examenes_lecturas'] loop
    execute format('drop policy if exists %I on public.%I', t || '_profesor_lee_alumnos', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (exists (select 1 from public.asignaciones_alumno a where a.alumno_id = %I.usuario_id and a.profesor_id = (select auth.uid()) and public.tiene_permiso(''progreso.ver_alumnos'')))',
      t || '_profesor_lee_alumnos', t, t);
  end loop;
end $$;

-- Primer superadmin (cuenta del propietario de la web). Idempotente.
insert into public.usuarios_roles (usuario_id, rol)
values ('6c21271a-420e-4ad0-9f64-909418ae0851', 'superadmin')
on conflict (usuario_id, rol) do nothing;

-- Las tablas nuevas no deben ser visibles para usuarios no autenticados (GraphQL / REST).
revoke all on public.roles, public.permisos, public.roles_permisos, public.usuarios_roles,
  public.cursos, public.cursos_profesores, public.asignaciones_alumno from anon;
revoke execute on function public.tiene_permiso(text), public.es_profesor_del_curso(bigint) from anon;
