# Easy English

Web oficial: https://jnfz92.github.io/

Las páginas HTML generales se mantienen en GitHub Pages. Los artículos y el progreso de aprendizaje se guardan en Supabase.

El inventario antiguo de ocho páginas en `public.paginas_blog` se archiva mediante `supabase/13_archivar_paginas_blog_legacy.sql`; sus registros públicos redirigen al contenido actual de GitHub. No se sincronizan copias HTML.

Ver `docs/mantenimiento-paginas.md` para mantenimiento y recuperación.

## Acceso y registro

[Mi perfil](https://jnfz92.github.io/perfil.html) incluye inicio de sesión
y registro en dos columnas (responsivo en móvil), recuperación de contraseña
y comprobación de sesión con Supabase Auth.

Ver [autenticación, tokens y límites de GitHub Pages](docs/autenticacion.md)
para las opciones de seguridad y los tests de navegador.
