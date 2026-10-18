-- Supabase concede permisos predeterminados de ejecución a anon en nuevas funciones
-- del esquema public. Tras la migración 14, se revocan explícitamente para
-- publicación y borrado. La lectura pública permanece disponible.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.publicar_comentario_articulo(text,bigint,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.eliminar_comentario_articulo(bigint) FROM anon;
COMMIT;
