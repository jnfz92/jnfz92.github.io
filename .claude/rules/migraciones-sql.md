---
description: Reglas para cambios de esquema SQL y migraciones de Supabase
paths:
  - "supabase/**"
---

# Migraciones y esquema

- **Todo cambio de esquema va en un archivo nuevo** en `supabase/migrations/` con nombre `AAAAMMDD_descripcion.sql` (fecha real del día, en formato año-mes-día). Ejemplo existente: `20261106_roles_cursos_profesores.sql`.
- Los `supabase/01_*` a `17_*` son **históricos**: no reejecutarlos ni añadir archivos nuevos con ese prefijo.
- `supabase/09` a `12` y `13` (`paginas_blog`) no se vuelven a ejecutar para tocar `paginas_blog` (ver `docs/mantenimiento-paginas.md`).
- Tablas sin SQL versionado (`battle_*`, `suscripciones`, `articulos_compras`, `configuracion_pagos`, `email_events`, `articulos_catalogo`, `movie_subtitle_phrases`, `bitacora_*`): **al tocarlas, primero versionar su definición actual** en una migración nueva, sin cambiarla.
- Migraciones **aditivas** cuando sea posible: `create table if not exists`, `add column if not exists`, políticas con nombre explícito. No eliminar columnas ni tablas con datos sin plan y copia de respaldo.
- Toda tabla nueva en `public`: `enable row level security` y políticas explícitas. Nada de permisos de escritura a `anon`.
- Lectura pública solo de contenido publicado (`publicado = true`); datos del alumno con `auth.uid() = usuario_id`.
- Funciones que escriben con reglas de negocio: `SECURITY DEFINER` con `set search_path` fijo y comprobación de `auth.uid()` dentro.
- Tras aplicar el cambio: revisar `get_advisors` (seguridad y rendimiento) y `list_tables` para confirmar RLS.
- Las migraciones no se aplican en producción desde el repositorio sin revisión: presentar el SQL al propietario antes de ejecutarlo si la acción es irreversible (`DROP`, `TRUNCATE`, borrado masivo).

**Why:** el esquema de producción ya tiene partes no versionadas; mezclar scripts históricos con cambios nuevos hace imposible reconstruir la base.
**How to apply:** usar la skill `migracion-supabase`.
