-- Easy English: esquema para proyecto Supabase nuevo. Ejecutar ANTES de 02_importar_examenes.sql
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists public.examenes(id bigint generated always as identity primary key,codigo text not null unique,titulo text not null,fecha date,nivel text not null default 'B1-B2',descripcion text,publicado boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.preguntas(id bigint generated always as identity primary key,examen_id bigint not null references public.examenes(id) on delete cascade,orden integer not null check(orden>0),enunciado text not null,opciones jsonb not null check(jsonb_typeof(opciones)='array' and jsonb_array_length(opciones) between 2 and 8),fuente_url text,unique(examen_id,orden),unique(id,examen_id));
create table if not exists private.soluciones(pregunta_id bigint primary key references public.preguntas(id) on delete cascade,respuesta_correcta integer not null check(respuesta_correcta between 0 and 7),explicacion text);
create table if not exists public.resultados(id bigint generated always as identity primary key,usuario_id uuid not null references auth.users(id) on delete cascade,examen_id bigint not null references public.examenes(id) on delete cascade,respuestas jsonb not null,aciertos integer not null,total integer not null check(total>0),nota numeric(5,2) not null check(nota between 0 and 100),fecha timestamptz not null default now());
create index if not exists resultados_usuario_fecha on public.resultados(usuario_id,fecha desc);
create index if not exists preguntas_examen_orden on public.preguntas(examen_id,orden);
alter table public.examenes enable row level security;
alter table public.preguntas enable row level security;
alter table private.soluciones enable row level security;
alter table public.resultados enable row level security;
revoke all on public.examenes,public.preguntas,public.resultados from anon,authenticated;
grant select on public.examenes,public.preguntas to anon,authenticated;
grant select on public.resultados to authenticated;
drop policy if exists "Examenes publicados" on public.examenes;
create policy "Examenes publicados" on public.examenes for select to anon,authenticated using(publicado=true);
drop policy if exists "Preguntas publicadas" on public.preguntas;
create policy "Preguntas publicadas" on public.preguntas for select to anon,authenticated using(exists(select 1 from public.examenes e where e.id=examen_id and e.publicado=true));
drop policy if exists "Resultados propios" on public.resultados;
create policy "Resultados propios" on public.resultados for select to authenticated using((select auth.uid())=usuario_id);
create or replace function public.entregar_examen(p_examen_id bigint,p_respuestas jsonb)
returns table(resultado_id bigint,aciertos integer,total integer,nota numeric)
language plpgsql security definer set search_path=''
as $$
declare v_user uuid := (select auth.uid()); v_total integer; v_aciertos integer; v_id bigint;
begin
 if v_user is null then raise exception 'Inicia sesión'; end if;
 if jsonb_typeof(p_respuestas) is distinct from 'object' then raise exception 'Formato inválido'; end if;
 if not exists(select 1 from public.examenes where id=p_examen_id and publicado=true) then raise exception 'Examen no disponible'; end if;
 if exists(select 1 from jsonb_each_text(p_respuestas) x where x.key !~ '^[0-9]+$' or x.value !~ '^[0-7]$') then raise exception 'Respuestas inválidas'; end if;
 if exists(select 1 from jsonb_each_text(p_respuestas) x where not exists(select 1 from public.preguntas p where p.examen_id=p_examen_id and p.id::text=x.key)) then raise exception 'Preguntas ajenas al examen'; end if;
 select count(*)::integer,count(*) filter(where (p_respuestas->>p.id::text)::integer=s.respuesta_correcta)::integer into v_total,v_aciertos
 from public.preguntas p join private.soluciones s on s.pregunta_id=p.id where p.examen_id=p_examen_id;
 if v_total=0 or v_total<>(select count(*) from public.preguntas where examen_id=p_examen_id) then raise exception 'Examen incompleto'; end if;
 insert into public.resultados(usuario_id,examen_id,respuestas,aciertos,total,nota) values(v_user,p_examen_id,p_respuestas,v_aciertos,v_total,round(v_aciertos::numeric*100/v_total,2)) returning id into v_id;
 return query select v_id,v_aciertos,v_total,round(v_aciertos::numeric*100/v_total,2);
end $$;
revoke all on function public.entregar_examen(bigint,jsonb) from public,anon;
grant execute on function public.entregar_examen(bigint,jsonb) to authenticated;
create or replace function public.ver_correccion(p_resultado_id bigint)
returns table(pregunta_id bigint,respuesta_correcta integer,explicacion text)
language plpgsql security definer set search_path=''
as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.resultados r where r.id=p_resultado_id and r.usuario_id=(select auth.uid())) then raise exception 'Resultado no disponible'; end if;
 return query select s.pregunta_id,s.respuesta_correcta,s.explicacion from public.resultados r join public.preguntas p on p.examen_id=r.examen_id join private.soluciones s on s.pregunta_id=p.id where r.id=p_resultado_id and r.usuario_id=(select auth.uid()) order by p.orden;
end $$;
revoke all on function public.ver_correccion(bigint) from public,anon;
grant execute on function public.ver_correccion(bigint) to authenticated;
