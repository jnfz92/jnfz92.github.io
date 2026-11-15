---
description: Artículos del blog en Supabase y su lector leer.html
paths:
  - "assets/articulos-supabase.js"
  - "leer.html"
  - "articulos.html"
  - "category/**"
  - "_layouts/post.html"
  - "assets/article-unified.css"
  - "assets/comentarios-articulos.*"
---

# Artículos y lector

- **Fuente:** `public.articulos` (120 artículos a 14-11-2026; consultar la tabla, no fiarse de la cifra). `ruta='post/<slug>.html'` es solo identificador de compatibilidad.
- **URL pública:** `https://jnfz92.github.io/leer.html?slug=<slug>`. Nunca crear `post/*.html` en GitHub ni enlazar a esas rutas.
- `leer.html` descarga el HTML completo, lo inserta sin sanear y reescribe enlaces entre lecciones, anclas y recursos. Por eso el HTML guardado debe ser de confianza (lo escribe solo el propietario).
- `assets/articulos-supabase.js` genera el catálogo en `index.html`, `articulos.html` y `category/*.html`. Las tarjetas de respaldo en HTML **no** se borran sin alternativa accesible.
- `404.html` redirige visitas antiguas `/post/<slug>.html` al lector (no es un 301).
- **Ruta de aprendizaje**: la constante `curriculum` de `assets/articulos-supabase.js` debe tener slugs únicos (`check_catalog.py` exige ≥ 80). Un artículo nuevo sin nivel MCER no se inventa: aparece en «Más artículos».
- Los apuntes personales MAKE pertenecen a la bitácora privada; no añadirlos al catálogo público ni a la portada.
- No cambiar `slug` ni `ruta` de un artículo existente sin plan de compatibilidad (los enlaces y los progresos de lectura dependen de ellos).
- Los artículos antiguos en verde se recolorean a azul en `leer.html`; los nuevos se escriben ya con tokens azules (`--ee-*`), sin segunda cabecera.
- No generar PDF ni enlaces de descarga.

**Why:** el lector es el único punto de entrada a los artículos; cualquier cambio de slug rompe lecturas guardadas y el perfil «Un artículo para ti».
**How to apply:** para publicar, usar la skill `publicar-articulo`. Para tocar el catálogo, ejecutar `python3 scripts/check_catalog.py`.
