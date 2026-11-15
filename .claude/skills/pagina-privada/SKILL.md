---
name: pagina-privada
description: Registra una página privada de Easy English (requiere sesión) en las dos listas de rutas protegidas y verifica el acceso. Usar al crear o convertir una página que debe exigir login.
---

# Página privada

## 1. Crear la página
- Seguir la skill `nueva-pagina-general` (header, `ee-site`, tokens, permalink).
- El HTML de una página privada no contiene datos personales en claro: los datos se leen de Supabase tras verificar sesión y mediante RLS.

## 2. Registrar en las DOS listas (obligatorio)
1. `assets/private-route.js` → añadir el archivo al `Set` `privatePages`, p. ej. `'mi-pagina.html'`.
2. `sw.js` → añadir la ruta al `Set` `privateRoutes`, p. ej. `'/mi-pagina.html'`.
3. Comprobar que ambos nombres coinciden exactamente (con y sin barra inicial).

## 3. Comportamiento esperado
- Sin sesión: redirección a `/login.html?next=<ruta>`.
- Con sesión: contenido visible tras `auth.getUser()`.
- Si no se puede verificar la sesión: mensaje sin datos personales.
- Los enlaces de recuperación de `perfil.html` no deben bloquearse.
- Si la página no debe ser privada en la caché, el service worker no la guarda (ya lo contempla `privateRoutes`).

## 4. Verificación
- `python scripts/check_routes.py`.
- `npx playwright test tests/auth-profile.spec.cjs --config=tests/playwright.config.cjs` si se toca login o perfil.
- Comprobar en navegador sin sesión que la página redirige a login; no usar credenciales reales ni crear usuarios reales.

## 5. Recordatorio de seguridad
La redirección en cliente **no protege datos**. La protección real es RLS en Supabase. Si la página lee tablas, comprobar sus políticas.

## Entrega
Indicar las dos listas actualizadas, la prueba de redirección realizada (o no realizada) y las tablas que lee.
