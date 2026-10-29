-- Ejecutar tras las migraciones previas. No reemplaza las tablas existentes.
create table if not exists public.vocabulario_items (
 id bigint generated always as identity primary key,
 en text not null unique, es text not null, example text,
 level text not null check (level in ('A1','A2','B1','B2','C1'))
);
create table if not exists public.vocabulario_preferencias (
 user_id uuid primary key references auth.users(id) on delete cascade,
 new_per_day integer not null default 10 check (new_per_day between 5 and 50),
 levels text[] not null default array['A1','A2','B1','B2','C1'],
 priority text not null default 'B2' check(priority in ('A1','A2','B1','B2','C1')),
 direction text not null default 'en-es' check(direction in ('en-es','es-en','mixed')),
 constraint valid_levels check (array_length(levels,1) between 1 and 5 and levels <@ array['A1','A2','B1','B2','C1']::text[])
);
create table if not exists public.vocabulario_progreso (
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id bigint not null references public.vocabulario_items(id) on delete cascade,
 streak integer not null default 0 check(streak>=0),
 last_grade integer not null default 0 check(last_grade between 0 and 2),
 next_review_at timestamptz not null default now(),
 first_seen_day date not null default current_date,
 primary key(user_id,item_id)
);
create index if not exists vocabulario_progreso_due on public.vocabulario_progreso(user_id,next_review_at);
alter table public.vocabulario_items enable row level security;
alter table public.vocabulario_preferencias enable row level security;
alter table public.vocabulario_progreso enable row level security;
create policy "Vocabulario legible por alumnos" on public.vocabulario_items for select to authenticated using (true);
create policy "Preferencias propias lectura" on public.vocabulario_preferencias for select to authenticated using ((select auth.uid())=user_id);
create policy "Preferencias propias insertar" on public.vocabulario_preferencias for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Preferencias propias actualizar" on public.vocabulario_preferencias for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Progreso propio lectura" on public.vocabulario_progreso for select to authenticated using ((select auth.uid())=user_id);
create policy "Progreso propio insertar" on public.vocabulario_progreso for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Progreso propio actualizar" on public.vocabulario_progreso for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select on public.vocabulario_items to authenticated;
grant select,insert,update on public.vocabulario_preferencias,public.vocabulario_progreso to authenticated;
insert into public.vocabulario_items(en,es,example,level) values
('give up','rendirse','Do not give up on your dreams.','B1'),
('despite','a pesar de','Despite the rain, we went out.','B2'),
('achieve','lograr','She achieved her goal.','B1'),
('carry out','llevar a cabo','They carried out a study.','B2'),
('come up with','idear / ocurrírsele','He came up with an idea.','B2'),
('whereas','mientras que','I prefer tea whereas she likes coffee.','B2'),
('nevertheless','sin embargo','It was hard; nevertheless, we finished.','B2'),
('thorough','minucioso / exhaustivo','We need a thorough review.','B2'),
('reluctant','reacio','She was reluctant to leave.','B2'),
('straightforward','sencillo / directo','The instructions are straightforward.','B2'),
('hello','hola','Hello! How are you?','A1'),
('usually','normalmente','I usually walk to school.','A2'),
('deadline','fecha límite','The deadline is tomorrow.','B2'),
('outcome','resultado','The outcome was positive.','B2'),
('albeit','aunque / si bien','The plan worked, albeit slowly.','C1')
on conflict(en) do nothing;