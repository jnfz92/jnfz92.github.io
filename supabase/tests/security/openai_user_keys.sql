-- Structural security checks for persistent per-user OpenAI keys.
do $$
declare table_oid oid := 'public.openai_user_keys'::regclass; policy_count integer;
begin
 if not (select relrowsecurity from pg_class where oid=table_oid) then raise exception 'RLS must be enabled'; end if;
 if has_table_privilege('anon',table_oid,'SELECT') or has_table_privilege('anon',table_oid,'INSERT') or has_table_privilege('anon',table_oid,'UPDATE') or has_table_privilege('anon',table_oid,'DELETE') then raise exception 'anon must not have table privileges'; end if;
 if has_table_privilege('authenticated',table_oid,'SELECT') or has_table_privilege('authenticated',table_oid,'INSERT') or has_table_privilege('authenticated',table_oid,'UPDATE') or has_table_privilege('authenticated',table_oid,'DELETE') then raise exception 'authenticated must not have table privileges'; end if;
 if not has_table_privilege('service_role',table_oid,'SELECT') or not has_table_privilege('service_role',table_oid,'INSERT') or not has_table_privilege('service_role',table_oid,'UPDATE') or not has_table_privilege('service_role',table_oid,'DELETE') then raise exception 'service_role must have CRUD privileges'; end if;
 select count(*) into policy_count from pg_policies where schemaname='public' and tablename='openai_user_keys';
 if policy_count<>0 then raise exception 'No browser-facing RLS policies should exist'; end if;
end $$;
