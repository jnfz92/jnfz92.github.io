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

## Cuaderno personal de errores

Al entregar un examen con una sesión de Supabase Auth iniciada, el RPC `public.entregar_examen` guarda el intento en `public.resultados`. El trigger `trg_registrar_preguntas_falladas` ejecuta `private.registrar_preguntas_falladas()`: registra las preguntas contestadas incorrectamente o en blanco en `public.preguntas_falladas`, incrementa `veces_fallada` en nuevos errores y marca `dominada = true` cuando el usuario acierta esa pregunta en un examen posterior. Los registros de preguntas superadas permanecen como historial.

La clave primaria (`usuario_id`, `pregunta_id`) impide duplicados por alumno y pregunta. La tabla aplica RLS: el usuario autenticado solo consulta sus errores mediante `auth.uid() = usuario_id`; no se concede a los clientes acceso de escritura. Las soluciones permanecen en `private.soluciones`, no en las consultas del cuaderno.

En `practicar.html#cuaderno-fallos`, el botón **Empezar mi examen de errores** genera una tanda aleatoria de hasta 20 preguntas pendientes del alumno, tomadas de diferentes exámenes; nunca muestra las soluciones antes de la entrega. Se requiere responder todas las preguntas para corregir. El historial individual de fallos ya no se muestra en pantalla para simplificar el perfil; los registros permanecen en Supabase y son la fuente del examen personalizado. `perfil.html` enlaza al cuaderno. La APK online comparte estos datos automáticamente sin recompilarse.

El RPC `public.entregar_repaso_fallos(uuid,jsonb)` comprueba `auth.uid()` y que cada pregunta enviada pertenezca a las pendientes de ese usuario, con un máximo de 20 por tanda. Corrige en el servidor desde `private.soluciones`, marca `dominada = true` si es correcta e incrementa `veces_fallada` si sigue fallándose. Los resultados de estos repasos se guardan de manera idempotente en `private.intentos_repaso_fallos` (RLS habilitada, sin permisos de lectura/escritura para clientes). **No modifica** `public.resultados` ni la nota del examen original. La corrección, explicaciones y puntuación solo se entregan al usuario después del envío; reintentar la misma entrega no vuelve a incrementar los fallos.

## Seguridad

Las seis tablas editoriales nuevas usan RLS y conceden a `anon` y `authenticated` **solo `SELECT`** de contenidos publicados. La edición editorial debe hacerse con credenciales de administrador desde el panel de Supabase, nunca con claves de servicio en el navegador.
