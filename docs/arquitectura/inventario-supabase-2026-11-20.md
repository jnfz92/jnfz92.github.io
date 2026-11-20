# Inventario de Supabase — Easy English

- Fecha de extracción: 2026-11-20
- Proyecto: `wnluofonzteaqtlfshgy` (PostgreSQL 17.6, región eu-central-2)
- Fuente: catálogos de PostgreSQL y herramientas de administración de Supabase, lectura únicamente.
- Rama documental: `chore/fase-1-consolidacion`

> Este documento es una fotografía del estado de producción. No es una migración ni autoriza cambios sobre el esquema.

## Resumen

| Esquema de aplicación | Objetos listados | Observaciones |
|---|---:|---|

- Objetos inventariados por la consulta de tablas: **0** en `public`, `private` y `editorial_archive`.
- Historial de migraciones registrado en Supabase: **0** entradas.
- Las 63 tablas de `public` y las 6 de `private` tienen RLS habilitado según el listado actual.
- `editorial_archive.articulos_pre_consolidacion_20261030` tiene RLS deshabilitado; contiene aproximadamente 157 filas según el linter.

## Objetos por esquema

## Migraciones registradas en producción

| Versión | Nombre |
|---|---|

## Hallazgos iniciales y límites

1. **RLS deshabilitado en archivo editorial.** El linter de Supabase lo marca como crítico. La comprobación de privilegios realizada en la misma sesión devuelve `USAGE=false` para `anon` y `authenticated` sobre `editorial_archive`, y `SELECT=false` sobre la tabla para ambos roles. Por tanto, no he confirmado acceso directo desde la API pública; aun así, debe mantenerse cerrado y añadirse RLS como defensa en profundidad tras decidir política explícita. No se ha modificado.
2. **Tablas privadas con RLS y sin políticas:** `private.actividad_soluciones`, `private.intentos_repaso_actividades`, `private.intentos_repaso_fallos`, `private.paginas_blog_respaldo_20261017`, `private.soluciones`, `private.sugerencia_votos`. Confirmar que no están expuestas y que solo las usan funciones privilegiadas autorizadas.
3. **Tablas públicas con RLS y sin políticas:** `public.battle_answers`, `public.battle_questions`, `public.battle_round_questions`, `public.email_events`. Revisar grants y consumidores; RLS sin políticas bloquea acceso por defecto, pero el acceso privilegiado debe documentarse.
4. **RPC SECURITY DEFINER ejecutables por anon:** `enviar_sugerencia`, `listar_comentarios_articulo`, `listar_sugerencias`, `votar_sugerencia`. Puede ser intencional, pero requieren inspección de cuerpo, validación de parámetros y límites antiabuso. No revocar automáticamente.
5. **29 RPC SECURITY DEFINER ejecutables por authenticated** detectadas por el asesor. Revisión individual necesaria; no es por sí solo una vulnerabilidad, pero exige verificar identidad, autorización, `search_path` y grants.
6. **Protección contra contraseñas filtradas desactivada** en Supabase Auth; recomendación de habilitar tras revisar impacto en registro y recuperación.
7. El linter de rendimiento detecta FKs sin índices de cobertura, evaluaciones repetidas de `auth.uid()` en políticas y políticas permisivas múltiples. No eliminar índices marcados como no usados sin analizar ventana de observación y consultas reales.

## Próximos pasos

- Obtener definiciones completas de políticas, funciones, vistas, triggers, constraints, índices y grants.
- Comparar las 63 tablas públicas y 6 privadas con los SQL versionados del repositorio.
- Determinar si los 61 registros de migración tienen su archivo fuente correspondiente en GitHub y localizar cualquier deriva.
- Crear pruebas de aislamiento de alumno/profesor/admin antes de corregir permisos.
- No modificar producción hasta disponer de respaldo, migración revisada y plan de reversión.
