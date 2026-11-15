---
description: Identidad visual obligatoria para páginas HTML, CSS y JS de interfaz
paths:
  - "**/*.html"
  - "assets/**/*.css"
  - "assets/**/*.js"
  - "_includes/**"
  - "_layouts/**"
---

# Diseño obligatorio de páginas

Regla completa en `CLAUDE.md` → «Regla obligatoria de diseño para TODAS las páginas». Resumen operativo:

**Estructura de cada página general**
- Front matter Jekyll con `permalink: /<archivo>.html` (lo exige `scripts/check_routes.py`).
- `<html lang="es">`, viewport, descripción, título `Página · Easy English`, `/favicon.svg`, `theme-color` **`#1e5eff`**.
- `/assets/site.css`, `/assets/navigation.css` y `/assets/navigation.js?v=<versión>`, con la **misma** versión `?v=` que `index.html`.
- `<body class="ee-site ...">` (sin `ee-site` no se aplican estilos comunes).
- `{% include header.html %}` una sola vez; contenido en `<main class="container">`; pie compartido.
- No cargar a mano `navigation-optimized.*`: lo añade `_includes/header.html`.
- No usar `_layouts/default.html` para páginas nuevas.
- Excepción única sin cabecera compartida: `login.html` y `registro.html` (`ee-auth-page`, `assets/login.css`).

**Tokens y patrones**
- Usar tokens `--ee-*` de `assets/site.css`. Nombres históricos: `--ee-green` = azul `#1e5eff`; `--ee-lime` = azul claro `#cde0ff`. No renombrar tokens sin migrar todos los usos.
- No introducir hexadecimales ni paletas nuevas en páginas; reutilizar `hero`, `eyebrow`, `ee-section-heading`, `grid`, `card`, `tag`, `ee-path`, `quick-links`, botones y formularios existentes.
- Sin `style=""` para maquetar. CSS específico en `assets/<pagina>.css` bajo una clase de página (`.ee-writings`, etc.).

**Accesibilidad y responsive**
- Labels reales, `focus-visible`, navegación por teclado, contraste AA (ver `scripts/audit-wcag-contrast.cjs`).
- Comprobar 320, 375, 768 y 1280 px sin scroll horizontal.
- Si no se ha podido verificar visualmente, decirlo: **no declarar «validado visualmente»**.

**Menú**: si se añade un enlace al menú, actualizar `_includes/header.html` **y** el fallback de `assets/navigation.js`, con estado activo y menú móvil. Orden de la barra inferior: Inicio, Artículos, Curso, Exámenes, Perfil.

**Why:** el sitio tiene identidad única; páginas con estilos propios se perciben como otra web y rompen menú y contraste.
**How to apply:** antes de crear o editar, comparar con `index.html` y `articulos.html`; reutilizar antes de inventar.
