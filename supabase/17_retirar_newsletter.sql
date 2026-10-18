-- Desinstalación completa del newsletter de Easy English.
-- La página, el workflow y la función de envío se retiran por separado.
-- No borrar datos personales si hubiera altas o envíos: abortar en ese caso.
BEGIN;

DO $$
DECLARE
  suscriptores bigint := 0;
  envios bigint := 0;
BEGIN
  IF to_regclass('public.newsletter_suscriptores') IS NOT NULL THEN
    SELECT count(*) INTO suscriptores FROM public.newsletter_suscriptores;
  END IF;
  IF to_regclass('public.newsletter_envios') IS NOT NULL THEN
    SELECT count(*) INTO envios FROM public.newsletter_envios;
  END IF;
  IF suscriptores > 0 OR envios > 0 THEN
    RAISE EXCEPTION 'No se borran registros: hay % suscriptores y % envíos.',suscriptores,envios;
  END IF;
END;
$$;

DROP TABLE IF EXISTS public.newsletter_envios;
DROP TABLE IF EXISTS public.newsletter_suscriptores;
ALTER TABLE public.articulos DROP COLUMN IF EXISTS newsletter_publicado_en;

COMMIT;
