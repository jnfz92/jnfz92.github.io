# Gestión de contenidos de Easy English

**Fuente editorial:** Supabase `wnluofonzteaqtlfshgy`. **Presentación:** GitHub Pages. Los visitantes no tienen permisos de escritura en las tablas editoriales nuevas.

## Publicar materiales

- **Artículos:** `public.articulos`, renderizados por `leer.html?slug=...`. No añadir `post/*.html` a GitHub.
- **PDF:** `public.recursos_descargables`, con `slug`, `titulo`, `descripcion`, `url_archivo`, `fecha_publicacion`, `orden` y `publicado`. Los seis PDF anteriores siguen alojados en `pdfs/` del repositorio. El listado de `downloads.html` se actualiza desde Supabase. `url_lectura` es opcional.
- **Vocabulario:** `public.vocabulario`, con `termino_en`, `traduccion_es`, `categoria`, `ejemplo_en`, `orden` y `publicado`. Se muestra en `vocabulario.html`.
- **Curso:** ordenar unidades en `public.unidades_curso` y asociar contenidos en `public.unidades_articulos`. Solo asignar niveles MCER verificados; usar «Sin especificar» cuando no estén confirmados. Se muestra en `curso.html`.
- **Colecciones PDF:** `public.colecciones_material` define qué PDF genera `scripts/build-pdfs.mjs`. Si `incluir_todos_articulos=true`, se incluyen todos los artículos; en caso contrario, los artículos se seleccionan/ordenan mediante `public.coleccion_articulos`. Para una colección de tipo `vocabulario`, el script emplea las entradas públicas de `public.vocabulario`.
- **Exámenes:** `public.examenes.articulo_slug` relaciona el examen evaluable con su artículo clásico. No confundir sus calificaciones: el clásico no guarda las notas del alumno.

## Actualización de los PDF

`.github/workflows/build-pdfs.yml` ejecuta el generador al modificar el script, manualmente desde GitHub Actions y una vez al día. **Los PDF físicos no se regeneran al instante al cambiar una tabla de Supabase.** Comprueba la ejecución y los PDF resultantes después de publicar una colección. El flujo hace commit en `main` si el contenido del PDF cambia.

## Respaldo HTML

`index.html`, `articulos.html`, `category/*.html`, `examenes.html` y `downloads.html` mantienen tarjetas de respaldo si la consulta a Supabase falla. En el uso normal, JavaScript genera el catálogo desde Supabase. No eliminar los respaldos sin sustituirlos por una alternativa accesible.

`public.paginas_blog` guarda copias de ocho páginas principales: mantenerlas sincronizadas cuando cambie el HTML de GitHub. Las páginas se publican desde GitHub, no directamente desde esa tabla.

## Seguridad

Las seis tablas editoriales nuevas usan RLS y conceden a `anon` y `authenticated` **solo `SELECT`** de contenidos publicados. La edición editorial debe hacerse con credenciales de administrador desde el panel de Supabase, nunca con claves de servicio en el navegador.
