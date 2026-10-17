# AGENTS.md — Reglas actuales de Easy English (Supabase)

## Arquitectura vigente (octubre de 2026)
- **La fuente del contenido del blog es la tabla `public.articulos` de Supabase**, proyecto `wnluofonzteaqtlfshgy`.
- Los 57 artículos originales se migraron a la base de datos. La carpeta `post/` se eliminó de GitHub.
- **No crear `post/*.html` en GitHub ni volver a enlazar a esas rutas.**
- Las URLs públicas de lectura son `https://jnfz92.github.io/leer.html?slug=<slug>`. El campo `ruta` de Supabase conserva el antiguo nombre `post/<slug>.html` solo como identificador de compatibilidad (por ejemplo, para las lecturas del alumno).
- `leer.html` descarga el HTML completo desde Supabase y reescribe enlaces entre lecciones, enlaces de navegación por anclas y rutas a los recursos.
- `assets/articulos-supabase.js` genera el catálogo en `index.html`, `articulos.html` y `category/*.html`.
- `404.html` permite conducir antiguas visitas a `/post/<slug>.html` hacia el lector. No es una redirección HTTP 301.
- `scripts/build-pdfs.mjs` obtiene el HTML de Supabase; no debe depender de la carpeta `post/`.
- `public.paginas_blog` contiene copias de ocho páginas generales; **actualizar la copia** si se modifica una de esas ocho páginas en GitHub. Las páginas siguen sirviéndose desde GitHub Pages.

## Publicar un nuevo artículo
1. Escribir un documento HTML completo y original, con estilo responsive, accesible y compatible con los recursos generales de Easy English.
2. Guardarlo en `public.articulos`, con `slug` único, `ruta='post/<slug>.html'` solo a efectos de compatibilidad, `titulo`, `descripcion`, `html`, `categoria_slug`, fecha real cuando se conozca y `url_publica='https://jnfz92.github.io/leer.html?slug=<slug>'`.
3. Asociar su categoría en `public.categorias_blog`; no inventar fecha o nivel MCER. Revisar el índice A1–B2 al incorporar un nivel nuevo: las lecciones no clasificadas aparecen en «Más artículos».
4. Comprobar la lectura con `leer.html?slug=<slug>`, los enlaces relativos y las anclas de la tabla de contenidos. Comprobar también la biblioteca y las categorías.
5. Conservar la privacidad: en el navegador solo se utilizan claves publicables de Supabase; no publicar credenciales service_role ni claves secretas.
6. Si hay Gmail conectado y autorizado, avisar de las nuevas publicaciones a `juanfranciscofernandezherreros@gmail.com`; nunca afirmar haber enviado el correo si no se hizo.

## Calidad editorial
- Incluir encabezado, título, categoría, resumen, secciones claras y enlaces de continuación.
- Para enseñar inglés a hispanohablantes, aportar ejemplos en inglés con traducción al español.
- Añadir explicaciones, errores frecuentes, ejercicios y soluciones cuando corresponda.
- Evitar contenido duplicado o superficial; usar ejemplos originales.
- Mantener el diseño apto para móvil y navegación por teclado.

## Integridad del sitio
- No eliminar contenido de Supabase ni cambiar los identificadores `slug` o `ruta` sin un plan de compatibilidad.
- Conservar `index.html`, `articulos.html`, `leer.html`, `practicar.html`, `perfil.html`, `category/*.html`, `assets/*` y los PDF.
- Los exámenes y resultados se guardan en tablas específicas; las preguntas falladas deben estar protegidas por políticas RLS por alumno.
- Hacer cambios pequeños en `main`, revisar sintaxis, enlaces y consultas y comprobar los datos tras cada modificación.
