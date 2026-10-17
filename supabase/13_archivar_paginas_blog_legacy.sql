-- Migración 13 · Easy English · 2026-10-17
-- Fuente única de HTML general: GitHub Pages. Supabase conserva solo URLs de compatibilidad.
-- Mantener el respaldo privado: NO eliminar public.paginas_blog hasta auditar consumidores externos.
-- Script idempotente; la primera ejecución preserva los ocho documentos completos originales.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.paginas_blog_respaldo_20261017
(LIKE public.paginas_blog INCLUDING ALL);

REVOKE ALL ON TABLE private.paginas_blog_respaldo_20261017
  FROM PUBLIC, anon, authenticated;
ALTER TABLE private.paginas_blog_respaldo_20261017 ENABLE ROW LEVEL SECURITY;

INSERT INTO private.paginas_blog_respaldo_20261017
  (ruta, titulo, descripcion, html, url_publica, actualizado_en)
SELECT ruta, titulo, descripcion, html, url_publica, actualizado_en
FROM public.paginas_blog
ON CONFLICT (ruta) DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM private.paginas_blog_respaldo_20261017) <> 8
    OR (SELECT count(*) FROM public.paginas_blog) <> 8
    OR EXISTS (
      SELECT 1
      FROM public.paginas_blog p
      LEFT JOIN private.paginas_blog_respaldo_20261017 b USING (ruta)
      WHERE b.ruta IS NULL
    )
  THEN
    RAISE EXCEPTION 'El respaldo de páginas no contiene las ocho rutas previstas: abortando';
  END IF;
END;
$$;

-- En el registro público queda únicamente un puntero a GitHub Pages.
-- No se copian ni se vuelven a mantener scripts, estilos, menús ni HTML de aplicación.
UPDATE public.paginas_blog AS p
SET html = pg_catalog.format($html$
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="0;url=https://jnfz92.github.io/%1$s">
  <meta name="robots" content="noindex">
  <title>Ir a Easy English</title>
</head>
<body>
  <main>
    <h1>Página trasladada a GitHub Pages</h1>
    <p>La versión actual se mantiene en GitHub.
      <a href="https://jnfz92.github.io/%1$s">Abrir la página de Easy English</a>.
    </p>
  </main>
</body>
</html>
$html$, p.ruta),
    actualizado_en = pg_catalog.now()
WHERE p.ruta IN (
  'index.html', 'articulos.html', 'examenes.html', 'practicar.html',
  'perfil.html', 'comunidad.html', 'mensajes.html', 'downloads.html'
);

COMMENT ON TABLE public.paginas_blog IS
  'LEGACY: ocho punteros HTML a GitHub Pages; no publicar ni mantener paginas aquí. Los originales están en private.paginas_blog_respaldo_20261017. No borrar sin auditar consumidores externos.';
COMMENT ON TABLE private.paginas_blog_respaldo_20261017 IS
  'Archivo privado de los ocho HTML completos anteriores a la unificación del 17-10-2026. No modificar ni exponer.';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.paginas_blog
      WHERE html LIKE '%https://jnfz92.github.io/%'
        AND html NOT LIKE '%recursos-supabase.js%'
        AND html NOT LIKE '%<script%') <> 8
  THEN
    RAISE EXCEPTION 'Verificación de punteros fallida: se revierte la migración';
  END IF;
END;
$$;

COMMIT;
