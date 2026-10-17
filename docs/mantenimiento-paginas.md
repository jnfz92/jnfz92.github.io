# Mantenimiento de páginas generales de Easy English

## Fuente única

La fuente única del HTML de las páginas generales es el repositorio `jnfz92/jnfz92.github.io`, publicado mediante GitHub Pages. Afecta a:

- `index.html`, `articulos.html`, `examenes.html` y `practicar.html`.
- `perfil.html`, `comunidad.html`, `mensajes.html` y `downloads.html`.

El contenido dinámico (artículos, lecciones, exámenes, sugerencias y progreso) continúa en sus respectivas tablas de Supabase. No se ha modificado.

## Supabase: archivo y compatibilidad

La migración **`supabase/13_archivar_paginas_blog_legacy.sql`** realiza una copia privada, íntegra y recuperable de los ocho documentos anteriores en `private.paginas_blog_respaldo_20261017`. La tabla `public.paginas_blog` no se elimina: sus ocho registros se convierten en documentos mínimos que redirigen a la URL vigente de GitHub.

El objetivo es impedir que reaparezcan menús y scripts antiguos (en especial `assets/recursos-supabase.js`, retirado del repositorio). No hay que volver a copiar HTML completo de GitHub a `public.paginas_blog`.

Los scripts SQL 09, 10, 11 y 12 son **migraciones históricas** y **no deben volver a ejecutarse** para retocar `paginas_blog`: corresponden a una arquitectura anterior. Para nuevas funciones, crear nuevas migraciones independientes.

## Actualizaciones

1. Editar el HTML directamente en GitHub, reutilizando `assets/navigation.js` y `assets/navigation.css`.
2. Dejar que GitHub Actions compruebe las rutas, los JS/CSS/recursos locales y las pruebas de navegador.
3. Publicar con GitHub Pages. **No sincronizar la tabla `paginas_blog`.**
4. Conservar el respaldo privado. Antes de eliminar definitivamente la tabla de compatibilidad, buscar también consumidores externos a los repositorios revisados (p. ej., herramientas administrativas o versiones antiguas de la APK).

## Recuperación

En caso de necesitar el contenido anterior, leer los registros de `private.paginas_blog_respaldo_20261017` desde el panel de administración autorizado. La tabla archivada no tiene permisos de lectura de los roles `anon` ni `authenticated`. No restaurar los ocho documentos antiguos en la web sin revisar cambios posteriores.

`downloads.html` debe seguir redirigiendo a `articulos.html`; los PDF de `pdfs/` se conservan solo como históricos.
