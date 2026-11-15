---
description: Páginas privadas, sesión Supabase y lista de rutas protegidas
paths:
  - "assets/private-route.js"
  - "sw.js"
  - "login.html"
  - "registro.html"
  - "perfil.html"
  - "assets/login.js"
  - "assets/registro.js"
  - "assets/aula-access.js"
  - "docs/autenticacion.md"
---

# Páginas privadas

- Una página privada nueva debe registrarse en **dos listas a la vez**:
  1. `assets/private-route.js` → `privatePages` (nombre de archivo, p. ej. `'mi-pagina.html'`).
  2. `sw.js` → `privateRoutes` (ruta con barra, p. ej. `'/mi-pagina.html'`).
  Si falta una, la página puede quedar en caché del service worker o mostrarse sin verificar sesión.
- Las listas actuales coinciden: `perfil`, `aula-b2`, `examenes`, `practicar`, `repasar-leidos`, `categorias-repaso`, `mi-vocabulario`, `comunidad`, `mensajes`, `historial-bitacora`, `constancia-b2`, `administracion`, `clave-openai`. `sw.js` además incluye `login.html` y `registro.html`. Mantenerlas alineadas.
- `private-route.js` oculta el contenido hasta verificar sesión con `auth.getUser()` y redirige a `/login.html?next=...`. Esto es UX, no seguridad: la seguridad real es RLS.
- Los enlaces de recuperación (`type=recovery`, `access_token`, `code`, `token_hash`) de `perfil.html` deben seguir funcionando: no bloquear esos parámetros.
- Clave publicable de Supabase en cliente: solo `sb_publishable_...`. Nunca `service_role`.
- Autenticación: `signInWithPassword`, `signUp` (mínimo 8 caracteres), `resetPasswordForEmail`, `PASSWORD_RECOVERY`. No guardar contraseñas ni refresh tokens propios.
- `docs/autenticacion.md` debe reflejar cualquier cambio de flujo; en Supabase, la URL `https://jnfz92.github.io/perfil.html` debe figurar en las URL permitidas.

**Why:** dos listas desincronizadas han causado que páginas privadas se sirvan desde caché.
**How to apply:** usar la skill `pagina-privada`.
