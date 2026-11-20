# CLAUDE.md — Reglas de Easy English (GitHub Pages + Supabase)

Fuente única de instrucciones del proyecto. `AGENTS.md` y `.github/copilot-instructions.md` solo remiten a este archivo: no duplicar reglas en ellos.

## Arquitectura vigente (noviembre de 2026)
- Sitio estático en GitHub Pages (Jekyll mínimo, sin build ni `package.json`) con Supabase como backend, proyecto `wnluofonzteaqtlfshgy`.
- **La fuente del contenido del blog es la tabla `public.articulos`** (120 artículos a 14-11-2026; consultar la tabla en lugar de fiarse de esta cifra). La carpeta `post/` se eliminó de GitHub.
- **No crear `post/*.html` en GitHub ni volver a enlazar a esas rutas.**
- Las URLs públicas de lectura son `https://jnfz92.github.io/leer.html?slug=<slug>`. El campo `ruta` conserva el antiguo nombre `post/<slug>.html` solo como identificador de compatibilidad (por ejemplo, para las lecturas del alumno).
- `leer.html` descarga el HTML completo desde Supabase, lo inserta en la página sin sanear y reescribe enlaces entre lecciones, anclas y rutas a recursos. Por eso **solo el propietario debe poder escribir en `public.articulos`**; no relajar esa política.
- `assets/articulos-supabase.js` genera el catálogo en `index.html`, `articulos.html` y `category/*.html`.
- `404.html` conduce las antiguas visitas a `/post/<slug>.html` hacia el lector. No es una redirección HTTP 301.
- Los PDF de `pdfs/` son archivos históricos; no generar nuevos PDF ni añadir enlaces de descarga.
- **`public.paginas_blog` es LEGACY**: sus ocho registros son punteros mínimos a GitHub Pages (originales en `private.paginas_blog_respaldo_20261017`). **No copiar ni sincronizar HTML en esa tabla** y no volver a ejecutar los scripts `supabase/09`–`12`. Ver `docs/mantenimiento-paginas.md`.
- La IA (corrección de writing y plan B2) pasa por la Edge Function `supabase/functions/easy-english-ai`, con la clave de OpenAI del propio alumno guardada solo en `sessionStorage`. No persistir ni registrar claves ni textos.

## Base de datos y migraciones
- Todo cambio de esquema va en un archivo nuevo dentro de `supabase/migrations/` (`AAAAMMDD_descripcion.sql`). Los archivos numerados `supabase/01`–`17` son históricos: no reejecutarlos ni añadir más.
- Varias tablas de producción aún no tienen SQL versionado (`battle_*`, `suscripciones`, `articulos_compras`, `configuracion_pagos`, `email_events`, `articulos_catalogo`, `movie_subtitle_phrases`, `bitacora_*`). Al tocarlas, versionar primero su definición.
- Todas las tablas de `public` tienen RLS; mantenerlo. Las tablas sin políticas se usan solo mediante RPC `SECURITY DEFINER`.
- Tras cada cambio de esquema, revisar los avisos de seguridad de Supabase.

## Publicar un nuevo artículo
1. Escribir un documento HTML completo y original, responsive, accesible y compatible con los recursos generales de Easy English.
2. Guardarlo en `public.articulos`, con `slug` único, `ruta='post/<slug>.html'` solo a efectos de compatibilidad, `titulo`, `descripcion`, `html`, `categoria_slug`, fecha real cuando se conozca y `url_publica='https://jnfz92.github.io/leer.html?slug=<slug>'`.
3. Asociar su categoría en `public.categorias_blog`; no inventar fecha ni nivel MCER. Revisar el índice A1–B2 al incorporar un nivel nuevo: las lecciones no clasificadas aparecen en «Más artículos».
4. Comprobar la lectura con `leer.html?slug=<slug>`, los enlaces relativos y las anclas de la tabla de contenidos. Comprobar también la biblioteca y las categorías.
5. Conservar la privacidad: en el navegador solo se usan claves publicables de Supabase; no publicar credenciales `service_role` ni claves secretas.
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
- Al añadir una página privada, registrarla en `assets/private-route.js` **y** en la lista `privateRoutes` de `sw.js`.
- Hacer cambios pequeños en `main`, revisar sintaxis, enlaces y consultas y comprobar los datos tras cada modificación.
- CI: `scripts/check_routes.py`, `scripts/check_catalog.py`, `scripts/audit-wcag-contrast.cjs`, Playwright (`tests/*.spec.cjs`) y Cucumber (`features/`). Si un cambio afecta a rutas, menú o contraste, ejecutar la comprobación correspondiente antes de entregar.

## Regla obligatoria de diseño para TODAS las páginas (nuevas y modificadas)

**Una página nueva de Easy English NO puede tener identidad visual independiente.** Antes de crear o editar HTML, CSS o JavaScript de interfaz, comparar con `index.html`, `articulos.html`, `writings.html` y con los estilos compartidos existentes. Reutilizar componentes y tokens de diseño; cualquier excepción visual debe estar justificada y limitada al componente.

### Estructura base obligatoria en páginas generales de GitHub Pages
- Añadir front matter de Jekyll y permalink cuando corresponda.
- Usar `<html lang="es">`, meta viewport, descripción, título `Página · Easy English`, favicon `/favicon.svg`, meta theme-color **`#1e5eff`**.
- Cargar **`/assets/site.css` y `/assets/navigation.css`** y el script **`/assets/navigation.js`**, con el mismo parámetro `?v=` que usan las demás páginas (copiarlo de `index.html`) para evitar caché obsoleta. `_includes/header.html` añade por su cuenta `navigation-optimized.css/js`: no cargarlos a mano.
- Establecer `<body class="ee-site ...">`; sin `ee-site` los estilos comunes NO se aplican.
- Incluir **`{% include header.html %}`** una sola vez y el contenido en `<main class="container">`. Usar el pie compartido o el patrón `ee-footer` existente; nunca duplicar cabeceras.
- Si la página aparece en la navegación, mantener sincronizados `_includes/header.html` y el fallback de `assets/navigation.js`, con estado activo y menú móvil.
- Excepción única: `login.html` y `registro.html` usan su propio marco de acceso (`ee-auth-page`, `assets/login.css`) sin cabecera compartida. No extender esa excepción a otras páginas.
- No usar `_layouts/default.html` para páginas nuevas: referencia `main.css` y `search.js`, que no existen.

### Lenguaje visual existente: reutilizar, no reinventar
- La identidad es **azul**. Los tokens de `assets/site.css` conservan nombres históricos: `--ee-green` es el azul de marca `#1e5eff` y `--ee-lime` el azul claro `#cde0ff`; junto a `--ee-bg`, `--ee-ink`, `--ee-muted` y `--ee-line`. Usar los tokens, no escribir colores hexadecimales ni introducir otra paleta, y no renombrarlos sin migrar todos sus usos.
- Emplear los patrones de `hero`, `eyebrow`, `ee-section-heading`, `grid`, `card`, `tag`, `read`, `ee-paths`, `ee-path`, `quick-links`, botones, formularios y espaciados que ya existen.
- Mantener las mismas tipografías, radios de borde, ancho de contenido, jerarquía de títulos, fondos, enlaces, estados hover/focus y contraste que la web principal.
- Evitar maquetar páginas enteras con estilos inline. Los estilos específicos deben residir en `assets/<pagina>.css`, aislados bajo clase de página (p. ej. `.ee-writings`), sin pisar la identidad compartida.
- Mantener tarjetas responsivas, formularios de ancho completo, accesibilidad (labels reales, focus-visible, teclado, contraste) y menús funcionales en móvil. No producir scroll horizontal a 320 px.

### Comprobaciones antes de entregar/publicar
1. Verificar presencia de `ee-site`, `site.css`, `navigation.css`, `navigation.js`, `header.html` y `main.container`.
2. Comparar visualmente con Inicio y Artículos en desktop y móvil; revisar cabecera, menú, tarjetas, formularios, pie, colores y tipografía.
3. Revisar enlaces internos y rutas Supabase; no comprometer autenticación ni RLS.
4. Probar controles con teclado, tamaños 320/375/768/1280 px y comprobar ausencia de overflow horizontal.
5. Si no ha sido posible realizar una comprobación visual real, indicarlo explícitamente: **no declarar que está visualmente validado**.

Esta regla aplica a páginas de GitHub Pages y, de forma equivalente, a documentos HTML completos guardados en `public.articulos` que se muestran mediante `leer.html`. Los artículos deben respetar la misma identidad sin introducir un segundo header ni romper el lector. Los artículos antiguos en verde se recolorean a azul en `leer.html`; los nuevos deben escribirse ya con los tokens azules.


## Skill obligatoria: Supabase como fuente de verdad

Cuando una tarea implique importar, restaurar, modificar, consultar o mostrar contenido que pertenece a Supabase, **lee y aplica la skill `supabase-source-of-truth` antes de actuar**. Está instalada para ambos agentes en:

- Claude Code: `.claude/skills/supabase-source-of-truth/SKILL.md`
- OpenAI Codex: `.agents/skills/supabase-source-of-truth/SKILL.md`

La skill exige operar realmente sobre Supabase (no sustituirlo por archivos locales de GitHub), comprobar los registros antes y después, conectar el frontend a la base de datos, preservar el comportamiento y diseño existentes y distinguir entre commit, despliegue y verificación en producción. Estas reglas complementan las instrucciones específicas de este proyecto; si hay una regla de proyecto más restrictiva, prevalece la más restrictiva.
