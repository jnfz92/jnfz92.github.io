BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.sugerencias (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 5 AND 100),
  descripcion text NOT NULL CHECK (char_length(btrim(descripcion)) BETWEEN 10 AND 1000),
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'publicada', 'rechazada')),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sugerencias_publicadas_orden
  ON public.sugerencias (creado_en DESC, id DESC)
  WHERE estado = 'publicada';

ALTER TABLE public.sugerencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sugerencias FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.sugerencia_votos (
  sugerencia_id bigint NOT NULL
    REFERENCES public.sugerencias(id) ON DELETE CASCADE,
  votante_id uuid NOT NULL,
  voto smallint NOT NULL CHECK (voto IN (-1, 1)),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sugerencia_id, votante_id)
);

ALTER TABLE private.sugerencia_votos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.sugerencia_votos FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enviar_sugerencia(
  p_titulo text,
  p_descripcion text
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_id bigint;
BEGIN
  IF p_titulo IS NULL
    OR pg_catalog.char_length(pg_catalog.btrim(p_titulo)) NOT BETWEEN 5 AND 100
    OR p_descripcion IS NULL
    OR pg_catalog.char_length(pg_catalog.btrim(p_descripcion)) NOT BETWEEN 10 AND 1000
  THEN
    RAISE EXCEPTION 'Escribe un título de 5 a 100 caracteres y una descripción de 10 a 1000 caracteres';
  END IF;

  INSERT INTO public.sugerencias (titulo, descripcion)
  VALUES (pg_catalog.btrim(p_titulo), pg_catalog.btrim(p_descripcion))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.enviar_sugerencia(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_sugerencia(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.listar_sugerencias(p_votante_id uuid)
RETURNS TABLE (
  id bigint,
  titulo text,
  descripcion text,
  creado_en timestamptz,
  me_gusta bigint,
  no_me_gusta bigint,
  mi_voto smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_votante_id IS NULL THEN
    RAISE EXCEPTION 'Identificador de navegador no válido';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.titulo,
    s.descripcion,
    s.creado_en,
    pg_catalog.count(v.sugerencia_id) FILTER (WHERE v.voto = 1),
    pg_catalog.count(v.sugerencia_id) FILTER (WHERE v.voto = -1),
    pg_catalog.max(v.voto) FILTER (WHERE v.votante_id = p_votante_id)
  FROM public.sugerencias AS s
  LEFT JOIN private.sugerencia_votos AS v ON v.sugerencia_id = s.id
  WHERE s.estado = 'publicada'
  GROUP BY s.id
  ORDER BY
    pg_catalog.count(v.sugerencia_id) FILTER (WHERE v.voto = 1) DESC,
    s.creado_en DESC,
    s.id DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.listar_sugerencias(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_sugerencias(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.votar_sugerencia(
  p_sugerencia_id bigint,
  p_votante_id uuid,
  p_voto smallint
) RETURNS TABLE (
  me_gusta bigint,
  no_me_gusta bigint,
  mi_voto smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_sugerencia_id IS NULL
    OR p_votante_id IS NULL
    OR p_voto IS NULL
    OR p_voto NOT IN (-1, 1)
  THEN
    RAISE EXCEPTION 'Voto no válido';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sugerencias AS s
    WHERE s.id = p_sugerencia_id
      AND s.estado = 'publicada'
  ) THEN
    RAISE EXCEPTION 'Esta sugerencia no está publicada';
  END IF;

  INSERT INTO private.sugerencia_votos
    (sugerencia_id, votante_id, voto)
  VALUES
    (p_sugerencia_id, p_votante_id, p_voto)
  ON CONFLICT (sugerencia_id, votante_id)
  DO UPDATE SET
    voto = EXCLUDED.voto,
    actualizado_en = pg_catalog.now();

  RETURN QUERY
  SELECT
    pg_catalog.count(*) FILTER (WHERE v.voto = 1),
    pg_catalog.count(*) FILTER (WHERE v.voto = -1),
    p_voto
  FROM private.sugerencia_votos AS v
  WHERE v.sugerencia_id = p_sugerencia_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.votar_sugerencia(bigint, uuid, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.votar_sugerencia(bigint, uuid, smallint) TO anon, authenticated;

-- Review submissions in Supabase, then publish them explicitly:
-- UPDATE public.sugerencias SET estado = 'publicada' WHERE id = 1;

UPDATE public.paginas_blog
SET html = regexp_replace(
      html,
      '(<nav class="ee-nav"[^>]*>[\s\S]*?)(</nav>)',
      E'\\1<a href="sugerencias.html">Sugerencias</a>\\2',
      'i'
    ),
    actualizado_en = now()
WHERE ruta IN (
  'articulos.html',
  'comunidad.html',
  'downloads.html',
  'examenes.html',
  'index.html',
  'mensajes.html',
  'perfil.html',
  'practicar.html'
)
AND html LIKE '%<nav class="ee-nav"%'
AND html NOT LIKE '%sugerencias.html%';

COMMIT;
