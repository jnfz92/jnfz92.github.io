# Repaso inteligente de vocabulario
## Puesta en marcha
1. Revisar y ejecutar `supabase/16_repaso_inteligente_vocabulario.sql` en el SQL Editor del proyecto Supabase. No se ejecuta automáticamente al publicar GitHub Pages.
2. Confirmar en el panel de Supabase que las tres tablas aparecen en la Data API y que RLS está activado.
3. Iniciar sesión desde `perfil.html` y visitar `mi-vocabulario.html`.
4. Probar con dos usuarios: cada uno solo debe ver y modificar su propio progreso y preferencias.
5. Revisar en escritorio y móvil, especialmente el menú y los botones con teclado.

## Comportamiento
- 10 palabras nuevas al día de forma predeterminada, configurable entre 5 y 50.
- Todos los niveles A1–C1 habilitados y prioridad B2; la prioridad solo ordena palabras nuevas.
- Tarjetas clásicas inglés→español, español→inglés o alternadas.
- Respuestas «No la sé», «Me cuesta» y «La sé» que programan la próxima revisión.
- Los repasos pendientes no consumen el cupo de palabras nuevas.
- Requiere usuario autenticado; no almacena el progreso de otros alumnos en el navegador.

## Limitaciones de esta primera versión
- Se incluyen 15 entradas de demostración; ampliar el banco de palabras desde Supabase.
- La carga está limitada a 1000 palabras de catálogo; paginar la consulta para un catálogo grande.
- La repetición inicial usa intervalos predefinidos, no FSRS.
- El límite diario emplea la fecha local del navegador para el contador y la fecha UTC de Supabase para guardar; conviene unificar el huso horario si se amplía.
- La seguridad de la base exige validar políticas RLS en la instancia real; aún no se ha ejecutado esa verificación.
- Es necesario validar visualmente el sitio publicado tras la integración.
