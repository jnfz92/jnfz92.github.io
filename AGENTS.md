# AGENTS.md — Reglas actuales de Easy English (Supabase)

## Arquitectura vigente (octubre de 2026)
- **La fuente del contenido del blog es la tabla `public.articulos` de Supabase**, proyecto `wnluofonzteaqtlfshgy`.
- Los 57 artículos originales se migraron a la base de datos. La carpeta `post/` se eliminó de GitHub.
- **No crear `post/*.html` en GitHub ni volver a enlazar a esas rutas.**
- Las URLs públicas de lectura son `https://jnfz92.github.io/leer.html?slug=<slug>`. El campo `ruta` de Supabase conserva el antiguo nombre `post/<slug>.html` solo como identificador de compatibilidad (por ejemplo, para las lecturas del alumno).
- `leer.html` descarga el HTML completo desde Supabase y reescribe enlaces entre lecciones, enlaces de navegación por anclas y rutas a los recursos.
- `assets/articulos-supabase.js` genera el catálogo en `index.html`, `articulos.html` y `category/*.html`.
- `404.html` permite conducir antiguas visitas a `/post/<slug>.html` hacia el lector. No es una redirección HTTP 301.
- Los PDF existentes se conservan como archivos históricos; no generar nuevos PDF ni añadir enlaces de descarga.
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

## Regla obligatoria de diseño para TODAS las páginas (nuevas y modificadas)

**Una página nueva de Easy English NO puede tener identidad visual independiente.** Antes de crear o editar HTML, CSS o JavaScript de interfaz, comparar con `index.html`, `articulos.html`, `writings.html` y con los estilos compartidos existentes. Reutilizar componentes y tokens de diseño; cualquier excepción visual debe estar justificada y limitada al componente.

### Estructura base obligatoria en páginas generales de GitHub Pages
- Añadir front matter de Jekyll y permalink cuando corresponda.
- Usar `<html lang="es">`, meta viewport, descripción, título `Página · Easy English`, favicon `/favicon.svg`, meta theme-color `#005B3C`.
- Cargar **`/assets/site.css` y `/assets/navigation.css`** y el script **`/assets/navigation.js`**, con versiones consistentes para evitar caché obsoleta.
- Establecer `<body class="ee-site ...">`; sin `ee-site` los estilos comunes de las páginas NO se aplican.
- Incluir **`{% include header.html %}`** una sola vez y el contenido en `<main class="container">`. Usar el pie compartido proporcionado por navegación o el patrón `ee-footer` existente; nunca duplicar cabeceras.
- Si la página aparece en la navegación, mantener sincronizados `_includes/header.html` y el fallback de `assets/navigation.js`, con estado activo y menú móvil.

### Lenguaje visual existente: reutilizar, no reinventar
- Reutilizar variables/tokens de `assets/site.css` (`--ee-green`, `--ee-lime`, `--ee-bg`, `--ee-ink`, `--ee-muted`, `--ee-line`) en lugar de introducir otra paleta.
- Emplear los patrones de `hero`, `eyebrow`, `ee-section-heading`, `grid`, `card`, `tag`, `read`, `ee-paths`, `ee-path`, `quick-links`, botones, formularios y espaciados que ya existen.
- Mantener las mismas tipografías, radios de borde, ancho de contenido, jerarquía de títulos, fondos, enlaces, estados hover/focus y contraste que la web principal.
- Evitar maquetar páginas enteras con estilos inline. Los estilos específicos deben residir en `assets/<pagina>.css`, aislados bajo clase de página (p. ej. `.ee-writings`), sin pisar la identidad compartida.
- Mantener tarjetas responsivas, formularios de ancho completo, accesibilidad (labels reales, focus-visible, teclado, contraste), y menús funcionales en móvil. No producir scroll horizontal a 320 px.

### Comprobaciones antes de entregar/publicar
1. Verificar presencia de `ee-site`, `site.css`, `navigation.css`, `navigation.js`, `header.html` y `main.container`.
2. Comparar visualmente con Inicio y Artículos en desktop y móvil; revisar cabecera, menú, tarjetas, formularios, pie, colores y tipografía.
3. Revisar enlaces internos y rutas Supabase; no comprometer autenticación ni RLS.
4. Probar controles con teclado, tamaños 320/375/768/1280 px y comprobar ausencia de overflow horizontal.
5. Si no ha sido posible realizar una comprobación visual real, indicarlo explícitamente: **no declarar que está visualmente validado**.

Esta regla aplica a páginas de GitHub Pages y, de forma equivalente, a documentos HTML completos guardados en `public.articulos` que se muestran mediante `leer.html`. Los artículos deben respetar la misma identidad sin introducir un segundo header ni romper el lector.
