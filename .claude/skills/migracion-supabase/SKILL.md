---
name: migracion-supabase
description: Crea una migración SQL nueva para Supabase (esquema, RLS, RPC SECURITY DEFINER) siguiendo la convención AAAAMMDD del proyecto y revisando advisors. Usar para cualquier cambio de tablas, políticas, funciones o triggers.
---

# Migración de Supabase

## Antes de escribir SQL
1. Inspeccionar el estado real: `list_tables` y `execute_sql` sobre `information_schema` / `pg_policies` de las tablas afectadas. No asumir el esquema por los archivos `supabase/*.sql` (algunas tablas no tienen SQL versionado).
2. Si la tabla es de las no versionadas (`battle_*`, `suscripciones`, `articulos_compras`, `configuracion_pagos`, `email_events`, `articulos_catalogo`, `movie_subtitle_phrases`, `bitacora_*`), **primero** crear una migración que versione su definición actual, sin cambiarla.

## Archivo
- Ruta: `supabase/migrations/AAAAMMDD_descripcion_corta.sql`, con la fecha real de hoy (formato año-mes-día) y descripción en `snake_case` sin tildes.
- Cabecera de comentario: propósito, si es aditiva, qué tablas toca y cómo revertirla.
- No tocar `supabase/01`–`17`. No crear archivos con esos prefijos.

## Reglas del SQL
- Aditivo por defecto: `create table if not exists`, `add column if not exists`, `create index if not exists`.
- Toda tabla nueva en `public`: `alter table ... enable row level security;` y políticas con nombre explícito.
- Lectura pública solo de filas `publicado = true` cuando el contenido sea editorial. Datos del alumno: `auth.uid() = usuario_id`.
- Sin `grant insert/update/delete` a `anon` ni `authenticated` sobre tablas editoriales.
- Funciones de escritura: `security definer`, `set search_path = public, private` (o el mínimo), comprobación de `auth.uid()` y validación de entradas.
- Tablas privadas (soluciones, intentos de repaso): esquema `private`, RLS activada, sin políticas para clientes.
- Idempotencia en entregas de alumno (uuid de intento) cuando haya reintentos de red.
- Ningún `drop`, `truncate` ni borrado masivo sin copia previa y confirmación del propietario. Si se necesita, presentar el SQL y esperar su aprobación.

## Aplicar y revisar
1. Presentar el SQL al propietario si la acción es irreversible; para cambios aditivos, aplicar con `apply_migration` o `execute_sql` según corresponda.
2. Ejecutar `get_advisors` (seguridad y rendimiento) y resolver los avisos nuevos.
3. Comprobar RLS con `pg_class.relrowsecurity` para las tablas tocadas.
4. Si cambia una RPC que usa el cliente, revisar el JS que la llama y los tests `tests/live-supabase.spec.cjs` / `tests/comentarios.spec.cjs` cuando aplique.
5. Documentar el cambio en el `docs/*.md` que corresponda (p. ej. `docs/gestion-contenidos.md`) con una frase.

## Entrega
Ruta del archivo de migración, tablas afectadas, advisors antes y después, y qué no se ha podido probar.
