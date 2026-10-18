-- Easy English · Comentarios anidados de los artículos
-- SQL 14: hilos de profundidad libre, escritura autenticada mediante RPC,
-- límite de frecuencia y borrado lógico que conserva respuestas.
BEGIN;

CREATE TABLE IF NOT EXISTS public.comentarios_articulos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  articulo_slug text NOT NULL REFERENCES public.articulos(slug) ON DELETE CASCADE,
  padre_id bigint REFERENCES public.comentarios_articulos(id) ON DELETE RESTRICT,
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contenido text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT pg_catalog.now(),
  eliminado boolean NOT NULL DEFAULT false,
  oculto boolean NOT NULL DEFAULT false,
  CONSTRAINT comentario_texto_valido CHECK (
    pg_catalog.char_length(pg_catalog.btrim(contenido)) BETWEEN 1 AND 2000
  ),
  CONSTRAINT comentario_no_auto_respuesta CHECK (padre_id IS NULL OR padre_id <> id)
);

CREATE INDEX IF NOT EXISTS comentarios_articulos_hilo_idx
  ON public.comentarios_articulos (articulo_slug, creado_en, id);
CREATE INDEX IF NOT EXISTS comentarios_articulos_padre_idx
  ON public.comentarios_articulos (padre_id) WHERE padre_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comentarios_articulos_autor_fecha_idx
  ON public.comentarios_articulos (autor_id, creado_en DESC);

ALTER TABLE public.comentarios_articulos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.comentarios_articulos FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.comentarios_articulos_id_seq FROM PUBLIC, anon, authenticated;

-- Solamente se devuelve el alias elegido como público; ni correo ni UUID del autor.
CREATE OR REPLACE FUNCTION public.listar_comentarios_articulo(p_slug text)
RETURNS TABLE(
  id bigint, padre_id bigint, autor_alias text, contenido text,
  creado_en timestamptz, es_mio boolean, eliminado boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT c.id, c.padre_id,
    CASE WHEN c.eliminado THEN 'Comentario eliminado'
         ELSE coalesce('@' || p.alias, 'Estudiante') END,
    CASE WHEN c.eliminado THEN '[Comentario eliminado]' ELSE c.contenido END,
    c.creado_en,
    (c.autor_id IS NOT NULL AND c.autor_id = auth.uid()) AS es_mio,
    c.eliminado
  FROM public.comentarios_articulos AS c
  LEFT JOIN public.perfiles_publicos AS p ON p.usuario_id = c.autor_id
  WHERE c.articulo_slug = p_slug AND NOT c.oculto
  ORDER BY c.creado_en, c.id
  LIMIT 500
$fn$;

CREATE OR REPLACE FUNCTION public.publicar_comentario_articulo(
  p_slug text, p_padre_id bigint, p_contenido text
) RETURNS bigint
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  u uuid := auth.uid();
  parent_slug text;
  parent_deleted boolean;
  parent_hidden boolean;
  new_id bigint;
BEGIN
  IF u IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para comentar';
  END IF;
  IF p_slug IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.articulos a WHERE a.slug = p_slug
  ) THEN
    RAISE EXCEPTION 'El artículo no existe';
  END IF;
  IF p_contenido IS NULL OR
     pg_catalog.char_length(pg_catalog.btrim(p_contenido)) NOT BETWEEN 3 AND 2000 THEN
    RAISE EXCEPTION 'Escribe entre 3 y 2000 caracteres';
  END IF;
  IF p_padre_id IS NOT NULL THEN
    SELECT c.articulo_slug, c.eliminado, c.oculto
      INTO parent_slug, parent_deleted, parent_hidden
    FROM public.comentarios_articulos c WHERE c.id = p_padre_id;
    IF NOT FOUND OR parent_slug <> p_slug OR parent_deleted OR parent_hidden THEN
      RAISE EXCEPTION 'No se puede responder a ese comentario';
    END IF;
  END IF;
  -- Serializar mensajes del mismo usuario evita saltarse límites en paralelo.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text, 3081));
  IF EXISTS (
    SELECT 1 FROM public.comentarios_articulos c
    WHERE c.autor_id = u AND c.creado_en > pg_catalog.now() - interval '8 seconds'
  ) THEN
    RAISE EXCEPTION 'Espera unos segundos antes de volver a comentar';
  END IF;
  IF (
    SELECT pg_catalog.count(*) FROM public.comentarios_articulos c
    WHERE c.autor_id = u AND c.creado_en > pg_catalog.now() - interval '15 minutes'
  ) >= 10 THEN
    RAISE EXCEPTION 'Has alcanzado el límite temporal de comentarios';
  END IF;
  INSERT INTO public.comentarios_articulos (articulo_slug, padre_id, autor_id, contenido)
  VALUES (p_slug, p_padre_id, u, pg_catalog.btrim(p_contenido))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.eliminar_comentario_articulo(p_id bigint)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
  UPDATE public.comentarios_articulos AS c
  SET contenido = '[Comentario eliminado]', eliminado = true
  WHERE c.id = p_id AND c.autor_id = u AND NOT c.eliminado;
  IF NOT FOUND THEN RAISE EXCEPTION 'No puedes eliminar ese comentario'; END IF;
  RETURN true;
END;
$fn$;

REVOKE ALL ON FUNCTION public.listar_comentarios_articulo(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publicar_comentario_articulo(text,bigint,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eliminar_comentario_articulo(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_comentarios_articulo(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publicar_comentario_articulo(text,bigint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_comentario_articulo(bigint) TO authenticated;

COMMENT ON TABLE public.comentarios_articulos IS
  'Comentarios y respuestas a profundidad libre. No acceder directamente: usar RPC públicas de lectura y RPC autenticadas de escritura/borrado.';
COMMIT;
