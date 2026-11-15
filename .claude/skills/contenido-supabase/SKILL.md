---
name: contenido-supabase
description: Edita contenido editorial de Easy English en Supabase (vocabulario, curso y unidades, actividades y preguntas, exámenes vinculados) respetando publicado, niveles MCER verificados y soluciones privadas. Usar para añadir o modificar contenido que no sea un artículo.
---

# Contenido editorial en Supabase

Referencia completa: `docs/gestion-contenidos.md`. Siempre leerla antes de tocar tablas.

## Dónde vive cada cosa
| Contenido | Tabla | Notas |
| --- | --- | --- |
| Vocabulario (`vocabulario.html`) | `public.vocabulario` | `termino_en`, `traduccion_es`, `categoria`, `ejemplo_en`, `orden`, `publicado` |
| Curso (`curso.html`) | `public.unidades_curso`, `public.unidades_articulos` | Niveles MCER solo si están verificados; si no, «Sin especificar» |
| Actividades | `public.actividades`, `public.actividad_preguntas`, `private.actividad_soluciones` | Publicar solo con preguntas, claves y medios completos |
| Exámenes | `public.examenes` (`articulo_slug` → artículo clásico) | No confundir calificaciones del clásico con las del alumno |

## Actividades: tipos y claves
- `seleccion`: configuración `{"opciones":[...]}`; clave privada `{"indice":N}` (base cero).
- `texto_corto`: clave `{"alternativas":[...]}`; comparación sin distinguir mayúsculas ni espacios sobrantes.
- `huecos`: configuración `{"campos":[...]}`; clave `{"campos":[[...],[...]]}`; cada hueco debe ser correcto.
- `transformacion`: configuración `{"palabra_clave":"..."}`; clave con alternativas.
- `redaccion`: `min_palabras`/`max_palabras`; **sin clave**, requiere revisión humana (no hay interfaz de profesor todavía; no afirmar que se corrige sola).
- Medios: `medio_tipo` `audio` o `imagen`, `medio_url` HTTPS accesible, `medio_alt` descriptivo.
- **Nunca** guardar soluciones en `configuracion`, `enunciado` ni en nombres de archivos.

## Procedimiento
1. Consultar el estado actual (`select` acotado) y no duplicar slugs ni órdenes.
2. Insertar o actualizar en lote (preferir una sola transacción/`batch`).
3. Dejar `publicado = false` hasta que todo esté completo; publicar al final.
4. Verificar en la web: `vocabulario.html`, `curso.html`, `actividades.html`, y la entrega de una respuesta de prueba **solo** con cuenta de prueba aislada o en local.
5. Revisar `get_advisors` si se tocaron políticas.

## Límites
- No conceder permisos de edición a `anon` o `authenticated`. Las ediciones se hacen desde el panel de administración o con credenciales del propietario.
- No modificar `public.preguntas`, `public.resultados` ni `public.examenes` de los exámenes evaluables sin pedirlo.
- Sin claves de servicio en el navegador ni en el repositorio.

## Entrega
Tablas tocadas, número de filas afectadas, estado `publicado`, y qué no se ha comprobado.
