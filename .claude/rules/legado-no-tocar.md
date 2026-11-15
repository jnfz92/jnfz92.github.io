---
description: Archivos y tablas legacy que no deben regenerarse ni reutilizarse
paths:
  - "pdfs/**"
  - "downloads/**"
  - "downloads.html"
  - "supabase/0*.sql"
  - "supabase/1*.sql"
  - "post/**"
  - "assets/recursos-supabase.js"
---

# Legado: no tocar sin motivo

- **`pdfs/`**: archivos históricos. No generar PDF nuevos ni añadir enlaces de descarga en la web ni en la APK.
- **`downloads/data/*.b64`**: datos históricos; no regenerar ni enlazar.
- **`downloads.html`**: debe seguir redirigiendo a `articulos.html`. No reconvertirla en página de descargas.
- **`public.paginas_blog`**: tabla LEGACY con 8 punteros mínimos. No copiar ni sincronizar HTML. El respaldo está en `private.paginas_blog_respaldo_20261017`; no restaurarlo sin revisar cambios posteriores.
- **`assets/recursos-supabase.js`**: retirado; no volver a referenciarlo.
- **`post/`**: carpeta eliminada de GitHub. No recrearla.
- **`supabase/01`–`17`**: históricos. Ver `migraciones-sql.md`.
- **`public.examenes.articulo_slug`**: relaciona examen y artículo clásico; no confundir calificaciones (el clásico no guarda las notas del alumno).
- `public.preguntas`, `public.resultados` y el cuaderno de errores previo no se modifican al tocar actividades o repasos nuevos.

**Why:** reejecutar scripts antiguos reescribe menús, scripts y fichas que ya están corregidos; el usuario ya cerró esas etapas.
**How to apply:** si una tarea parece pedir alguno de estos elementos, preguntar al propietario antes de tocarlos.
