-- Read-only structural security assertions for the production RPC contract.
-- Run against a disposable/local Supabase database after applying its migrations:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security/phase4_rpc_hardening.sql
-- This verifies function definition and EXECUTE grants; it does not replace
-- two-user behavioral tests in an isolated environment.

BEGIN;

DO $$
DECLARE
  v_oid oid := to_regprocedure('public.battle_finalize(uuid)');
  v_definition text;
  v_config text[];
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'FAIL: public.battle_finalize(uuid) is missing';
  END IF;

  SELECT pg_get_functiondef(v_oid), p.proconfig
    INTO v_definition, v_config
  FROM pg_proc AS p
  WHERE p.oid = v_oid;

  IF position('public.battle_players' IN v_definition) = 0
     OR position('status=''accepted''' IN v_definition) = 0
     OR position('auth.uid()' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'FAIL: battle_finalize lacks the accepted-player ownership guard';
  END IF;

  IF NOT has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated cannot execute battle_finalize';
  END IF;

  IF has_function_privilege('anon', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute battle_finalize';
  END IF;

  IF NOT ('search_path=""' = ANY(coalesce(v_config, ARRAY[]::text[]))) THEN
    RAISE EXCEPTION 'FAIL: battle_finalize must pin an empty search_path';
  END IF;

  RAISE NOTICE 'PASS: battle_finalize has accepted-player guard, expected grants, and empty search_path';
END;
$$;

ROLLBACK;
