# Gestión de contenidos de Easy English

**Fuente editorial:** Supabase `wnluofonzteaqtlfshgy`. **Presentación:** GitHub Pages. Los visitantes no tienen permisos de escritura en las tablas editoriales nuevas.

## Motor universal de actividades (2026-10-17)

**Entrada:** `curso.html` enlaza con `actividades.html`. Las actividades publicadas vinculadas a una unidad se muestran bajo esa unidad; también hay un catálogo general en `actividades.html`. El catálogo y las preguntas se leen dinámicamente de Supabase, tanto en la web como en la APK online.

**Edición desde Supabase SQL Editor:** La migración `supabase/05_motor_actividades.sql` crea `public.actividades` (slug, título, descripción, destreza, unidad_id opcional, articulo_slug opcional, orden, publicado), `public.actividad_preguntas` y `private.actividad_soluciones`. No conceder permisos de edición a `anon` o `authenticated`. Publicar solo cuando estén completas las preguntas, sus claves objetivas y todos los recursos multimedia. El archivo `supabase/06_demo_actividades.sql` crea un ejemplo sin unidad, visible en el catálogo general y no presentado como examen oficial.

**Tipos de preguntas** (`public.actividad_preguntas.tipo`):

| tipo | configuracion JSONB pública | clave JSONB privada |
| --- | --- | --- |
| `seleccion` | `{"opciones":["opción A","opción B"]}` | `{"indice":1}` (base cero) |
| `texto_corto` | `{}` | `{"alternativas":["written","otra forma válida"]}` |
| `huecos` | `{"campos":["Hueco 1","Hueco 2"]}` | `{"campos":[["has","have"],["since"]]}` |
| `transformacion` | `{"palabra_clave":"FOR"}` | `{"alternativas":["I have lived here for years."]}` |
| `redaccion` | `{"min_palabras":140,"max_palabras":190}` | Sin clave: requiere revisión humana |

Los tipos anteriores se pueden acompañar de **audio o imagen** en `medio_tipo='audio'|'imagen'`, `medio_url` HTTPS y `medio_alt` descriptivo. El medio es independiente del tipo de respuesta: por ejemplo, un listening de elección múltiple lleva `tipo='seleccion', medio_tipo='audio'`. Los audios o las imágenes deben estar alojados en una URL HTTPS accesible. No almacenar soluciones en `configuracion`, en `enunciado` ni en nombres de ficheros multimedia.

**Guardar y corregir:** `public.entregar_actividad(p_actividad_id bigint,p_respuestas jsonb,p_intento_id uuid)` exige sesión y actividad publicada, comprueba que todas las preguntas pertenezcan a esa actividad y limita a 50 preguntas por entrega. Lee las soluciones en `private.actividad_soluciones`; devuelve la corrección *después* de entregar y guarda un intento por UUID en `public.actividad_intentos`. Las variantes cortas se comparan ignorando mayúsculas y espacios exteriores/repetidos. Los huecos solo se consideran correctos si todos lo son; se pueden definir variantes por hueco. Las redacciones se etiquetan `revision` sin calificarse automáticamente. **No hay todavía interfaz para que un profesor revise redacciones**: se requiere una funcionalidad posterior, no se debe asumir que se corrigen solas.

**Privacidad y compatibilidad:** RLS permite consultar las actividades y preguntas publicadas sin cuenta, pero los intentos solamente a su autor con `auth.uid()`. Las soluciones privadas nunca se exponen por Data API. Se puede repetir una entrega tras un corte de red gracias a `p_intento_id` sin crear un intento duplicado. No se modifican `public.examenes`, `public.preguntas`, `public.resultados` ni el cuaderno de errores previo. Los errores objetivos de las actividades se incorporan automáticamente al repaso unificado descrito más abajo. Las redacciones permanecen pendientes de revisión humana, sin contar como fallos.

## Seguimiento del aprendizaje unificado (web y Android)

El perfil `perfil.html` muestra un resumen conjunto de lecturas, exámenes tradicionales, actividades interactivas entregadas y errores pendientes de ambos sistemas. Cada nota de examen y cada respuesta conserva su valor propio: el resumen no mezcla calificaciones distintas. La consulta está restringida al usuario autenticado.

`supabase/07_progreso_unificado.sql` crea `public.actividad_fallos`, visible mediante RLS solo a su dueño. Un trigger sobre `public.actividad_intentos` registra errores objetivos, incrementa los fallos repetidos y marca dominadas las respuestas acertadas. Los intentos idempotentes no duplican errores. `supabase/08_racha_actividades.sql` acredita las actividades interactivas en la racha diaria, además de las lecturas y los exámenes.

`practicar.html#cuaderno-fallos` mezcla hasta 20 preguntas erróneas de exámenes y actividades en una misma tanda, con opciones múltiples, respuesta corta, huecos, transformaciones, imagen y audio cuando corresponda. Cada subconjunto se corrige en Supabase: `entregar_repaso_fallos` para exámenes y `entregar_repaso_actividades` para actividades. Los UUID de entrega se conservan para evitar duplicados tras fallos de conexión. La nota del examen original no se altera. El antiguo listado individual de fallos permanece oculto.

La APK Cordova 1.1.1 incorpora acceso al perfil online desde el arranque y desde el curso incluido sin conexión. Con internet usa la web pública y el progreso de Supabase; el progreso del curso antiguo offline permanece independiente, no se sincroniza automáticamente.

## Menú inferior y pie de página compartidos

`assets/navigation.js` y `assets/navigation.css` definen la barra inferior de la web en pantallas de hasta 760 px y el pie de página completo en escritorio y móvil. El **mismo orden y los mismos iconos** que en el modo offline de Android son: **Inicio, Artículos, Curso, Exámenes, Perfil**. El acceso activo se marca automáticamente, incluyendo páginas relacionadas (artículos, actividades, exámenes, comunidad y mensajes). La barra no aparece dos veces. Se deja espacio inferior para que no cubra los formularios y se recoloca «Volver arriba».

Todas las páginas HTML incluyen estos dos recursos y `leer.html` también los incorpora al HTML de artículos obtenido de Supabase, que sustituye el documento inicial mediante `document.write`. Las páginas antiguas con pie de página lo sustituyen y las nuevas reciben el mismo pie. Los enlaces adicionales a Actividades, Vocabulario, PDF, Comunidad y Mensajes siguen disponibles en el pie de página y en las páginas correspondientes sin recargar la barra de cinco accesos.

En `english-apk` la versión Cordova 1.1.2 alinea la barra inferior del curso sin conexión con este diseño; con conexión, la APK reutiliza directamente la web. Los avances del modo offline siguen siendo independientes.

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

## Lectura aleatoria pendiente en el perfil

Al abrir `perfil.html` con una sesión válida, se muestra automáticamente una tarjeta «Un artículo para ti». Cuando están disponibles el catálogo de `public.articulos` y las lecturas de `public.lecturas` del usuario, se elige al azar uno de los artículos todavía no leídos. «Sugerir otro» evita repetir la recomendación anterior cuando quedan varias opciones. El enlace lleva a `leer.html?slug=...`; «Ya lo he leído» guarda la lectura en Supabase y actualiza el progreso de la biblioteca.

Cuando el alumno termina todos los artículos disponibles, se muestra una felicitación en vez de recomendar lecturas ya terminadas. Nunca se felicita si el catálogo está vacío o la carga no se ha completado. La recomendación se recalcula tras marcar o desmarcar lecturas y no aparece sin iniciar sesión.

## Cuaderno personal de errores

Al entregar un examen con una sesión de Supabase Auth iniciada, el RPC `public.entregar_examen` guarda el intento en `public.resultados`. El trigger `trg_registrar_preguntas_falladas` ejecuta `private.registrar_preguntas_falladas()`: registra las preguntas contestadas incorrectamente o en blanco en `public.preguntas_falladas`, incrementa `veces_fallada` en nuevos errores y marca `dominada = true` cuando el usuario acierta esa pregunta en un examen posterior. Los registros de preguntas superadas permanecen como historial.

La clave primaria (`usuario_id`, `pregunta_id`) impide duplicados por alumno y pregunta. La tabla aplica RLS: el usuario autenticado solo consulta sus errores mediante `auth.uid() = usuario_id`; no se concede a los clientes acceso de escritura. Las soluciones permanecen en `private.soluciones`, no en las consultas del cuaderno.

En `practicar.html#cuaderno-fallos`, el botón **Empezar mi examen de errores** genera una tanda aleatoria de hasta 20 preguntas pendientes del alumno, tomadas de diferentes exámenes; nunca muestra las soluciones antes de la entrega. Se requiere responder todas las preguntas para corregir. El historial individual de fallos ya no se muestra en pantalla para simplificar el perfil; los registros permanecen en Supabase y son la fuente del examen personalizado. `perfil.html` enlaza al cuaderno. La APK online comparte estos datos automáticamente sin recompilarse.

El RPC `public.entregar_repaso_fallos(uuid,jsonb)` comprueba `auth.uid()` y que cada pregunta enviada pertenezca a las pendientes de ese usuario, con un máximo de 20 por tanda. Corrige en el servidor desde `private.soluciones`, marca `dominada = true` si es correcta e incrementa `veces_fallada` si sigue fallándose. Los resultados de estos repasos se guardan de manera idempotente en `private.intentos_repaso_fallos` (RLS habilitada, sin permisos de lectura/escritura para clientes). **No modifica** `public.resultados` ni la nota del examen original. La corrección, explicaciones y puntuación solo se entregan al usuario después del envío; reintentar la misma entrega no vuelve a incrementar los fallos.

## Seguridad

Las seis tablas editoriales nuevas usan RLS y conceden a `anon` y `authenticated` **solo `SELECT`** de contenidos publicados. La edición editorial debe hacerse con credenciales de administrador desde el panel de Supabase, nunca con claves de servicio en el navegador.
