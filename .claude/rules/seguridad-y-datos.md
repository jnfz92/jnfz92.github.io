---
description: Seguridad, RLS, claves y privacidad del alumno (siempre activa)
---

# Seguridad y datos

- **Solo el propietario escribe en `public.articulos`** (y en el resto de tablas editoriales). El HTML de artículos se inserta sin sanear en `leer.html`; no relajar esa política de escritura ni conceder `INSERT/UPDATE` a `anon` o `authenticated`.
- **RLS activa en todas las tablas de `public`.** Las tablas sin políticas solo se usan mediante RPC `SECURITY DEFINER`. Tras cada cambio de esquema, revisar los avisos de seguridad (`get_advisors`) del proyecto Supabase.
- Las soluciones de exámenes y actividades viven en esquemas privados (`private.soluciones`, `private.actividad_soluciones`). Nunca exponerlas por Data API ni enviarlas al cliente antes de la entrega.
- Datos del alumno (`resultados`, `preguntas_falladas`, `actividad_intentos`, `lecturas`): RLS con `auth.uid() = usuario_id`. Nunca confiar en un booleano o un flag del navegador para autorizar.
- **Clave OpenAI del alumno**: solo en `sessionStorage`; no persistir, no registrar en consola, logs, URLs ni Supabase. La IA pasa por la Edge Function `supabase/functions/easy-english-ai`. No loguear textos de alumnos completos.
- No poner datos personales ni sensibles en parámetros de URL.
- Las páginas privadas ocultas en el cliente **no** son seguridad real: la protección de datos es RLS.
- No copiar a páginas ni a la documentación el correo del propietario ni datos de cuentas. Para avisos por Gmail, solo al propietario y solo si Gmail está conectado y autorizado.

**Why:** GitHub Pages sirve HTML público; la única barrera real de datos es Supabase (RLS + RPC). Las pruebas de Playwright no deben crear usuarios reales.
**How to apply:** en cualquier cambio que toque Auth, claves, RPC o tablas de alumno, verificar RLS y que no aparece ninguna clave secreta en el diff.

Ver también las reglas `proyecto-general`, `migraciones-sql` y `paginas-privadas`.
