---
name: nueva-pagina-general
description: Crea o modifica una página general de Easy English (GitHub Pages) respetando la identidad visual, el header compartido, la navegación y el sistema de rutas. Usar para cualquier página HTML nueva o cambio de maquetación en la web.
---

# Nueva página general o cambio de interfaz

## 1. Antes de escribir código
- Leer `CLAUDE.md` (sección de diseño) y `.github/copilot-instructions.md`.
- Abrir como referencia `index.html`, `articulos.html` y `writings.html` y copiar el **sistema visual**: `hero`, `eyebrow`, `ee-section-heading`, `grid`, `card`, `tag`, `ee-path`, `quick-links`, botones y formularios.
- Buscar si ya existe un componente parecido: `Grep` sobre `assets/site.css` y `assets/*.css`.

## 2. Esqueleto obligatorio
```html
---
permalink: /nombre-pagina.html
---
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="...">
  <meta name="theme-color" content="#1e5eff">
  <title>Título · Easy English</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css?v=VERSION">
  <link rel="stylesheet" href="/assets/navigation.css?v=VERSION">
  <link rel="stylesheet" href="/assets/nombre-pagina.css?v=VERSION"><!-- solo si hace falta -->
  <script src="/assets/navigation.js?v=VERSION" defer></script>
</head>
<body class="ee-site ee-nombre">
  {% include header.html %}
  <main class="container">
    <!-- contenido -->
  </main>
  <!-- pie compartido o patrón ee-footer existente -->
</body>
</html>
```
- `VERSION`: copiar el `?v=` de `index.html` (no inventar). El `?v=` de `navigation.js` debe ser **idéntico** en todas las páginas: lo exige `scripts/check_catalog.py`. Los `?v=` de CSS pueden variar por página.
- `permalink` debe ser `/<archivo>.html`: lo valida `scripts/check_routes.py`.
- No usar `_layouts/default.html` (referencia `main.css` y `search.js`, que no existen).
- No cargar `navigation-optimized.*` a mano.
- Excepción única sin cabecera: `login.html` y `registro.html`.

## 3. Estilos
- Solo tokens `--ee-*` (`--ee-green` = azul `#1e5eff`, `--ee-lime` = `#cde0ff`, `--ee-bg`, `--ee-ink`, `--ee-muted`, `--ee-line`). Sin hexadecimales nuevos.
- Estilos propios en `assets/<pagina>.css` bajo la clase `.ee-<pagina>`. Sin `style=""` para maquetar.

## 4. Menú y rutas
- Si la página entra en el menú: actualizar `_includes/header.html` **y** el fallback de `assets/navigation.js`, con estado activo y menú móvil.
- Si la página es privada: usar la skill `pagina-privada`.
- Si enlaza a rutas nuevas, comprobar que existen.

## 5. Verificación
1. `python scripts/check_routes.py` (permalinks, enlaces y assets).
2. Si toca menú o catálogo: `python3 scripts/check_catalog.py`.
3. Si toca color o CSS: `node scripts/audit-wcag-contrast.cjs`.
4. Si toca JS: `node --check assets/<archivo>.js`.
5. Visual: 320, 375, 768 y 1280 px; sin scroll horizontal; teclado; comparar con Inicio y Artículos. Si no es posible, **decirlo** y no declarar validación visual.

## 6. Entrega
Lista de archivos tocados, comprobaciones ejecutadas (con resultado real) y comprobaciones pendientes.
