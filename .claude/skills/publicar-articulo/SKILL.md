---
name: publicar-articulo
description: Publica o actualiza un artículo de Easy English en public.articulos (Supabase) y lo verifica en leer.html, el catálogo y las categorías. Usar cuando el usuario pida escribir, publicar, actualizar o corregir un artículo del blog.
---

# Publicar un artículo

Fuente: `public.articulos` en Supabase (`wnluofonzteaqtlfshgy`). **No** crear `post/*.html` en GitHub.

## Pasos

1. **Leer el estado actual**: `execute_sql` con `select slug, titulo, categoria_slug, ruta, url_publica from public.articulos where slug = '<slug>'` y comprobar que el slug es nuevo (o que es una actualización explícita pedida por el propietario). Consultar también `public.categorias_blog` para la categoría.
2. **Redactar el HTML completo** y original, responsive y accesible:
   - Encabezado con título, categoría, resumen y nivel solo si está verificado.
   - Secciones claras con anclas (`id`) para la tabla de contenidos; enlaces de continuación a otras lecciones con `leer.html?slug=...`.
   - Ejemplos en inglés con traducción al español; errores frecuentes; ejercicios con soluciones al final cuando corresponda.
   - Usar solo tokens `--ee-*` (azul). Sin `<html>`, `<head>` ni cabecera propia: el lector ya la pone. Sin estilos inline para maquetar.
   - Sin scripts externos ni claves. Sin enlaces a PDF.
3. **Fecha**: usar la fecha real de publicación si se conoce; no inventarla. **Nivel MCER**: no inventarlo; si no está verificado, dejarlo como «Sin especificar».
4. **Insertar o actualizar** con `execute_sql` (o con la herramienta de tabla que el propietario indique). Campos obligatorios:
   - `slug` único, en minúsculas con guiones (`[a-z0-9-]+`).
   - `ruta = 'post/<slug>.html'` (solo compatibilidad).
   - `titulo`, `descripcion`, `html`, `categoria_slug`.
   - `url_publica = 'https://jnfz92.github.io/leer.html?slug=<slug>'`.
   Usar parámetros o literales de dólar (`$body$ ... $body$`) para el HTML.
5. **Categoría**: asociarla en `public.categorias_blog`. Si el nivel es nuevo, revisar el índice A1–B2 de `assets/articulos-supabase.js`; los artículos sin clasificar aparecen en «Más artículos».
6. **Ruta de aprendizaje**: si el artículo debe figurar en la ruta, añadir su slug a `curriculum` en `assets/articulos-supabase.js` (slug único). Ejecutar `python3 scripts/check_catalog.py`.
7. **Verificar** (sin declarar «validado» lo no comprobado):
   - Abrir `https://jnfz92.github.io/leer.html?slug=<slug>` (o el navegador de la app) y comprobar enlaces relativos y anclas de la tabla de contenidos.
   - Comprobar `articulos.html` y la categoría.
   - Ejecutar `get_advisors` si se tocaron políticas (no debería ser necesario para un simple INSERT).
8. **Aviso por correo** (solo si Gmail está conectado y autorizado): avisar de la nueva publicación a `juanfranciscofernandezherreros@gmail.com`. **Nunca afirmar que se envió si no se envió.** Pedir confirmación antes de enviar, porque es una acción de salida.

## No hacer
- No modificar `slug` ni `ruta` de un artículo existente sin plan de compatibilidad.
- No borrar artículos sin confirmación explícita del propietario.
- No tocar `public.paginas_blog` ni `pdfs/`.
- No escribir credenciales ni claves `service_role` en el HTML.

## Entrega
Resumir: slug, URL pública, categoría, nivel (o «Sin especificar»), qué se comprobó y qué no.
