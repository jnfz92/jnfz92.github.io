# Inventario de Supabase — Easy English

- Fecha: 2026-11-20
- Proyecto: `wnluofonzteaqtlfshgy` · PostgreSQL 17.6 · región `eu-central-2`
- Método: lectura de metadatos; no se han modificado datos ni esquema.
- Fuente: catálogos PostgreSQL, listado Supabase y asesores Supabase.

> Fotografía del entorno de producción. Este documento no es una migración ni autoriza cambios de esquema.

## Resumen

| Esquema | Objetos listados | Observación |
|---|---:|---|
| `public` | 63 | Datos y API de la aplicación |
| `private` | 6 | Datos internos de la aplicación |
| `editorial_archive` | 1 | Archivo editorial histórico |

- Objetos listados: **70**.
- Migraciones registradas en producción: **66**.
- Esquema `public`: 63 tablas, todas con RLS habilitado.
- Esquema `private`: 6 tablas, todas con RLS habilitado.
- Esquema `editorial_archive`: 1 tabla con RLS deshabilitado.

## Objetos por esquema

### public (63)

| Objeto | RLS | Filas (estimación API) | Comentario |
|---|---|---:|---|
| `examenes` | Sí | 28 |  |
| `preguntas` | Sí | 569 |  |
| `resultados` | Sí | 27 |  |
| `perfiles` | Sí | 1 |  |
| `lecturas` | Sí | 20 |  |
| `actividad_diaria` | Sí | 23 |  |
| `perfiles_publicos` | Sí | 1 |  |
| `seguimientos` | Sí | 1 |  |
| `mensajes_privados` | Sí | 7 |  |
| `solicitudes_mensaje` | Sí | 1 |  |
| `articulos` | Sí | 133 |  |
| `categorias_blog` | Sí | 7 |  |
| `paginas_blog` | Sí | 8 | LEGACY: ocho punteros HTML a GitHub Pages; no publicar ni mantener paginas aquí. Los originales están en private.paginas_blog_respaldo_20261017. No borrar sin auditar consumidores externos. |
| `preguntas_falladas` | Sí | 284 |  |
| `recursos_descargables` | Sí | 6 |  |
| `vocabulario` | Sí | 57 |  |
| `unidades_curso` | Sí | 51 |  |
| `unidades_articulos` | Sí | 144 |  |
| `colecciones_material` | Sí | 3 |  |
| `coleccion_articulos` | Sí | 11 |  |
| `actividades` | Sí | 5 |  |
| `actividad_preguntas` | Sí | 40 |  |
| `actividad_intentos` | Sí | 0 |  |
| `actividad_fallos` | Sí | 0 |  |
| `sugerencias` | Sí | 0 |  |
| `comentarios_articulos` | Sí | 3 | Comentarios y respuestas a profundidad libre. No acceder directamente: usar RPC públicas de lectura y RPC autenticadas de escritura/borrado. |
| `examenes_lecturas` | Sí | 4 |  |
| `writing_borradores` | Sí | 0 |  |
| `vocabulario_items` | Sí | 15 |  |
| `vocabulario_preferencias` | Sí | 1 |  |
| `vocabulario_progreso` | Sí | 15 |  |
| `battle_rooms` | Sí | 0 |  |
| `battle_players` | Sí | 0 |  |
| `battle_questions` | Sí | 120 |  |
| `battle_round_questions` | Sí | 0 |  |
| `battle_answers` | Sí | 0 |  |
| `progreso_curso` | Sí | 3 |  |
| `objetivos_semanales` | Sí | 1 |  |
| `recursos_guardados` | Sí | 0 |  |
| `diagnosticos_b2` | Sí | 1 |  |
| `planes_estudio_b2` | Sí | 1 |  |
| `sesiones_estudio_b2` | Sí | 0 |  |
| `simulacros_b2` | Sí | 2 |  |
| `bitacora_categorias` | Sí | 2 |  |
| `bitacora_anotaciones` | Sí | 28 |  |
| `planes_ia_b2` | Sí | 1 |  |
| `mensajes_vistos` | Sí | 2 |  |
| `seguimiento_semanal` | Sí | 5 |  |
| `roles` | Sí | 4 |  |
| `permisos` | Sí | 4 |  |
| `roles_permisos` | Sí | 6 |  |
| `usuarios_roles` | Sí | 2 |  |
| `cursos` | Sí | 0 |  |
| `cursos_profesores` | Sí | 0 |  |
| `asignaciones_alumno` | Sí | 0 |  |
| `movie_subtitle_phrases` | Sí | 10046 |  |
| `articulos_catalogo` | Sí | 119 |  |
| `articulos_compras` | Sí | 1 |  |
| `suscripciones` | Sí | 0 |  |
| `configuracion_pagos` | Sí | 1 |  |
| `email_events` | Sí | 6 |  |
| `subtitulos_srt` | Sí | 0 |  |
| `favoritos_articulos` | Sí | 0 |  |

### private (6)

| Objeto | RLS | Filas (estimación API) | Comentario |
|---|---|---:|---|
| `soluciones` | Sí | 569 |  |
| `intentos_repaso_fallos` | Sí | 6 |  |
| `actividad_soluciones` | Sí | 39 |  |
| `intentos_repaso_actividades` | Sí | 0 |  |
| `sugerencia_votos` | Sí | 0 |  |
| `paginas_blog_respaldo_20261017` | Sí | 8 | Archivo privado de los ocho HTML completos anteriores a la unificación del 17-10-2026. No modificar ni exponer. |

### editorial_archive (1)

| Objeto | RLS | Filas (estimación API) | Comentario |
|---|---|---:|---|
| `articulos_pre_consolidacion_20261030` | No | 157 |  |

## Historial de migraciones en producción

| Versión | Nombre |
|---|---|
| `20261013205417` | `easy_english_perfiles_lecturas` |
| `20261014185056` | `crear_tabla_articulos_easy_english` |
| `20261014185341` | `categorias_metadatos_y_paginas_blog` |
| `20261014185601` | `guardar_automaticamente_preguntas_falladas` |
| `20261015151451` | `corregir_repasos_y_validar_entregas_examenes_20261015` |
| `20261015151808` | `indices_relaciones_examenes_20261015` |
| `20261015152004` | `lectura_contexto_examen_001_20261015` |
| `20261015154437` | `centralizar_recursos_vocabulario_curso_colecciones_20261015` |
| `20261015155401` | `indice_vocabulario_articulo_relacionado_20261015` |
| `20261017082547` | `examen_repaso_errores_personales_20261017` |
| `20261017090150` | `motor_universal_actividades_20261017` |
| `20261017090755` | `actividad_demo_motor_universal_20261017` |
| `20261017131132` | `progreso_unificado_20261017` |
| `20261017131738` | `racha_actividades_interactivas_20261017` |
| `20261017201133` | `sugerencias_votos_y_enlace_navegacion_20261017` |
| `20261017210441` | `archivar_y_unificar_paginas_blog_20261017` |
| `20261018075827` | `comentarios_anidados_articulos_20261018` |
| `20261018075919` | `restringir_rpc_comentarios_anon_20261018` |
| `20261018094035` | `newsletter_diario_suscriptores_y_publicaciones_20261018` |
| `20261018175826` | `retirar_newsletter_por_solicitud_20261018` |
| `20261021080244` | `exam_by_read_articles_secure_personalized_attempts` |
| `20261022101243` | `restrict_exams_and_questions_to_authenticated_users` |
| `20261027084138` | `crear_borradores_writing_b2` |
| `20261029140846` | `repaso_inteligente_vocabulario` |
| `20261029142553` | `harden_vocab_permissions_and_trigger_functions` |
| `20261029173505` | `harden_catalog_and_dangerous_table_privileges` |
| `20261030071253` | `hide_revision_present_past_article_from_public` |
| `20261030071931` | `hide_exercise_exam_solution_articles_from_public` |
| `20261030074145` | `protect_private_speaking_only_authenticated_users` |
| `20261030092058` | `backup_articles_before_editorial_consolidation` |
| `20261101190301` | `add_private_course_progress` |
| `20261101192012` | `support_started_and_completed_course_units` |
| `20261101192421` | `add_private_weekly_learning_goals` |
| `20261101192604` | `add_private_saved_articles_and_units` |
| `20261101192955` | `add_optional_public_profile_bio_avatar` |
| `20261101194516` | `add_b2_diagnostics_plans_sessions_mock_exams_admin_catalog_policy` |
| `20261101195459` | `add_admin_suggestions_and_comments_moderation_policies` |
| `20261101195934` | `enable_reading_in_daily_b2_study_tasks` |
| `20261101211431` | `simulacros_b2_idempotent_attempts` |
| `20261101212032` | `resultados_intentos_idempotentes` |
| `20261103211308` | `crear_bitacora_privada_por_alumno` |
| `20261103211539` | `conservar_anotaciones_al_borrar_categoria` |
| `20261104103557` | `private_vocabulary_articles_owned_by_kiko` |
| `20261104163831` | `planes_ia_b2_privados` |
| `20261105094944` | `mensajes_vistos` |
| `20261106075312` | `create_private_weekly_learning_followup` |
| `20261106113119` | `roles_cursos_profesores` |
| `20261106113136` | `revocar_anon_tablas_roles_cursos` |
| `20261107232707` | `create_movie_subtitle_phrases` |
| `20261107232836` | `restrict_movie_phrase_table_to_public_read_only` |
| `20261107232937` | `temporary_phrase_import_access` |
| `20261107232947` | `remove_temporary_phrase_import_access` |
| `20261108122436` | `add_movie_phrase_learning_fields` |
| `20261108145418` | `add_movie_phrase_translations_and_grammar_links` |
| `20261110100728` | `add_article_paywall_and_billing` |
| `20261110100820` | `expose_public_subscription_price` |
| `20261110100945` | `keep_article_catalog_in_sync_on_delete` |
| `20261110101008` | `restrict_payment_records_to_owner` |
| `20261110121316` | `separate_fce_monthly_membership` |
| `20261110123344` | `transactional_email_events` |
| `20261116211425` | `subtitulos_srt` |
| `20261116212309` | `subtitulos_srt_unicidad` |
| `20261117094721` | `assign_task_exams_to_juan_profile` |
| `20261117094759` | `index_task_exams_by_owner_and_date` |
| `20261117094958` | `make_task_exams_per_user_owner` |
| `20261119214918` | `create_favoritos_articulos` |

## Hallazgos de seguridad y rendimiento

### RLS deshabilitado en archivo editorial

Supabase Security Advisor marca `editorial_archive.articulos_pre_consolidacion_20261030` como crítico por tener RLS deshabilitado (157 filas estimadas por el asesor). La comprobación de privilegios ejecutada en esta sesión encontró `USAGE=false` para los roles `anon` y `authenticated` sobre el esquema, y `SELECT=false` sobre la tabla para ambos roles. Por tanto, no se ha confirmado acceso directo desde los roles de la API; el aviso sigue siendo válido como defensa en profundidad. No se ha aplicado automáticamente `ENABLE ROW LEVEL SECURITY`: hacerlo sin definir una política explícita bloquearía cualquier acceso legítimo futuro.

### Tablas RLS habilitado sin políticas

El asesor identifica 10 tablas sin políticas: `private.actividad_soluciones`, `private.intentos_repaso_actividades`, `private.intentos_repaso_fallos`, `private.paginas_blog_respaldo_20261017`, `private.soluciones`, `private.sugerencia_votos`, `public.battle_answers`, `public.battle_questions`, `public.battle_round_questions`, `public.email_events`. Revisar grants y consumidores privilegiados; sin políticas, RLS deniega el acceso ordinario, pero deben documentarse las vías de acceso legítimas.

### RPC SECURITY DEFINER ejecutables por anon

El asesor identifica cuatro: `enviar_sugerencia`, `listar_comentarios_articulo`, `listar_sugerencias`, `votar_sugerencia`. Puede ser intencional, pero requiere revisar el cuerpo, validación de parámetros, abuso automatizado, identidad declarada por el cliente y límites de frecuencia.

#### Revisión de las cuatro RPC anónimas

Las cuatro tienen `SET search_path TO ''`, lo que es una buena mitigación contra secuestro de `search_path`. La revisión preliminar de cuerpos detecta:

- `enviar_sugerencia`: inserta sugerencias anónimas y valida longitudes (título 5–100; descripción 10–1000). Revisar rate limiting y spam.
- `listar_comentarios_articulo`: devuelve comentarios no ocultos y limita a 500; la exposición parece funcionalmente pública. Verificar sanitización en el cliente al renderizar contenido.
- `listar_sugerencias`: recibe `p_votante_id` desde el cliente y lo usa para calcular `mi_voto`. No debe considerarse identidad autenticada.
- `votar_sugerencia`: recibe `p_votante_id` desde el cliente y hace upsert de voto. Un identificador UUID aportado por el navegador es suplantable; si se pretende que el voto sea resistente a manipulación, migrar a identidad autenticada o a un token firmado/servidor con límites y controles antiabuso. No se cambió la función.

### RPC SECURITY DEFINER ejecutables por authenticated

El asesor informa de 29 funciones. No implica automáticamente una vulnerabilidad: estas funciones pueden necesitar privilegios elevados. Cada una debe verificarse en cuanto a `auth.uid()`, autorización de recurso, `search_path` fijo, validación de entradas y grants de ejecución.

### Otros avisos

- Protección de contraseñas filtradas desactivada en Supabase Auth.
- Avisos de rendimiento: índices de cobertura de claves foráneas ausentes, llamadas de autenticación reevaluadas por fila en ciertas políticas RLS y políticas permisivas múltiples.
- No retirar índices por el mero hecho de que aparezcan como no usados sin revisar estadísticas, periodo de observación y consultas reales.
- Avisos de visibilidad en GraphQL deben contrastarse con el diseño intencionado del API: visibilidad del esquema no equivale por sí sola a lectura de filas cuando RLS está correctamente aplicado.

### Deriva entre migraciones registradas y archivos del repositorio

La base de datos registra **66 migraciones** en `supabase_migrations.schema_migrations`. En la rama principal inspeccionada, el directorio `supabase/migrations/` contiene **3 archivos**. El repositorio también contiene scripts SQL históricos fuera de ese directorio, pero no deben tratarse automáticamente como una cadena de migración reproducible. Hay una diferencia documental importante que CONS-005/006 debe resolver: mapear cada versión registrada a su SQL fuente, identificar las versiones ausentes y decidir una estrategia de baseline segura. No generar una migración masiva ni marcar versiones como aplicadas sin comparar el esquema completo.

## Próximos pasos

1. Obtener definiciones completas de políticas, funciones, vistas, triggers, constraints, índices y grants.
2. Comparar los objetos de producción con los SQL del repositorio y localizar deriva de esquema.
3. Revisar primero las cuatro RPC ejecutables por anon y las 29 RPC ejecutables por authenticated.
4. Probar aislamiento alumno/profesor/admin con identidades de prueba.
5. Preparar migraciones de corrección y reversión; no ejecutar cambios en producción hasta probarlos en un entorno aislado.
