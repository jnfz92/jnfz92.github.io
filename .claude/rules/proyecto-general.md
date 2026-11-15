---
description: Arquitectura y fuentes de verdad de Easy English (siempre activa)
---

# Easy English: reglas generales

- `CLAUDE.md` es la única fuente de instrucciones del proyecto. `AGENTS.md` y `.github/copilot-instructions.md` solo lo remiten; no duplicar reglas en ellos.
- Sitio estático en GitHub Pages (Jekyll mínimo, sin `package.json` ni build). Backend: Supabase, proyecto `wnluofonzteaqtlfshgy`.
- **Contenido editorial vive en Supabase**, no en el repositorio. Artículos en `public.articulos`; vocabulario en `public.vocabulario`; curso en `public.unidades_curso` y `public.unidades_articulos`; actividades en `public.actividades`.
- Antes de editar cualquier archivo, leer `CLAUDE.md` y `docs/` relacionados (`docs/gestion-contenidos.md`, `docs/mantenimiento-paginas.md`, `docs/autenticacion.md`).
- Cambios pequeños, en `main`, con revisión de sintaxis, enlaces y consultas tras cada modificación.
- Idioma: la interfaz, la documentación y los comentarios de usuario están en **español**. Los ejemplos de inglés llevan traducción al español.
- Nunca afirmar que algo está publicado, enviado, probado o validado visualmente si no se ha hecho. Indicar explícitamente lo no verificado.
- Nunca publicar ni escribir en el repositorio claves `service_role`, contraseñas, tokens de usuario ni claves de OpenAI. Solo claves publicables (`sb_publishable_...`) en el cliente.

**Why:** el proyecto mezcla GitHub Pages, Supabase y contenido editorial; un cambio en el sitio equivocado (repositorio en vez de Supabase, o al revés) rompe la lectura de alumnos.
**How to apply:** ante cualquier tarea de contenido, decidir primero si el destino es Supabase o el repositorio, y leer la skill o rule específica.

Ver también las reglas `seguridad-y-datos`, `legado-no-tocar` y `verificacion-ci`.
