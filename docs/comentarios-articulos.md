# Comentarios de artículos y respuestas anidadas

La funcionalidad se mantiene en el repositorio y en Supabase mediante la migración `supabase/14_comentarios_articulos.sql`.

## Qué puede hacer un visitante
- **Sin iniciar sesión:** leer los comentarios y las respuestas, incluidos hilos de más de dos niveles.
- **Con sesión:** publicar comentarios, contestar a cualquier comentario y borrar los propios sin borrar respuestas.
- El nombre mostrado es el alias voluntariamente público definido en Comunidad; si no existe, se muestra «Estudiante», nunca el correo electrónico.

En cada artículo de `leer.html?slug=...` se añade un bloque «Comentarios y respuestas» después del contenido. El cliente seguro está en `assets/comentarios-articulos.js`, y el diseño en `assets/comentarios-articulos.css`. Los documentos HTML históricos en `public.articulos` no se editan.

## Protección de datos y abuso
- `public.comentarios_articulos` tiene RLS activado y **ningún permiso SQL directo** para `anon` o `authenticated`. Toda lectura y escritura pasa por las funciones RPC con permisos separados.
- `listar_comentarios_articulo(slug)`: listado público de hasta 500 comentarios por artículo. Solo expone ID de comentario, ID de respuesta, alias público, contenido, fecha y si pertenece al usuario de la sesión.
- `publicar_comentario_articulo(slug,padre_id,contenido)`: requiere Auth, 3–2000 caracteres, padre existente del mismo artículo, 8 segundos entre publicaciones y máximo 10 publicaciones por 15 minutos.
- `eliminar_comentario_articulo(id)`: solo el autor, borrado lógico que conserva el hilo.
- El cliente usa `textContent` para representar todo el contenido del usuario (evita ejecutar HTML de comentarios).

## Moderación por administradores
Si aparece spam o contenido inapropiado, se puede ocultar un comentario desde el SQL Editor con permisos administrativos:

```sql
UPDATE public.comentarios_articulos
SET oculto = true
WHERE id = <id_de_comentario>;
```

Sustituir el marcador por el identificador real antes de ejecutar. Se mantienen sus hijos, pero una respuesta a un comentario oculto no puede publicarse. Para reabrirlo: `SET oculto = false`.

La moderación avanzada, los avisos de contenido y la paginación para hilos con más de 500 comentarios son mejoras posteriores.

## Pruebas
`tests/comentarios.spec.cjs` simula los RPC y verifica el árbol de respuestas, la escritura autenticada, el borrado lógico y la representación segura. `.github/workflows/browser-e2e.yml` las ejecuta en pull requests y después de publicar.
