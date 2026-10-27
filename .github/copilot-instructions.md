# Instrucciones obligatorias de interfaz: Easy English

Aplica estas reglas a cualquier cambio de HTML, CSS o JavaScript de páginas de este repositorio.

1. **Lee `AGENTS.md` antes de editar.** Su sección «Regla obligatoria de diseño para TODAS las páginas» es la fuente de verdad.
2. Las páginas generales de Jekyll/GitHub Pages deben incluir `<body class="ee-site ...">`, `{% include header.html %}`, `<main class="container">`, `/assets/site.css`, `/assets/navigation.css` y `/assets/navigation.js`; usar favicon y metadatos de Easy English.
3. Copia **el sistema visual**, no el código completo, de `index.html`, `articulos.html` y `writings.html`: clases `hero`, `eyebrow`, `ee-section-heading`, `grid`, `card`, `tag`, `ee-path`, `quick-links`; tokens `--ee-*` del CSS global.
4. No inventes diseños aislados, hojas base competidoras ni formularios sin estilos compartidos. CSS puntual en archivo `assets/<pagina>.css` bajo una clase específica de página; evita `style=""` para la maquetación.
5. Si agregas enlaces al menú, actualiza el include de la cabecera y su fallback en `assets/navigation.js`, y gestiona el estado activo.
6. Conserva el comportamiento de los formularios y de Supabase, con seguridad RLS y únicamente claves publicables en cliente.
7. Antes de dar por terminado, comprueba responsive a 320, 375, 768 y 1280 px, navegación por teclado, accesibilidad, enlaces y ausencia de scroll horizontal. No afirmes haber hecho comprobación visual si no la has realizado.
8. Los artículos HTML de `public.articulos` deben usar el mismo diseño, sin duplicar la cabecera del lector `leer.html`.

Si una solicitud contradice estas reglas visuales, prioriza la consistencia del diseño salvo petición explícita del propietario de cambiar la identidad de todo el sitio.
