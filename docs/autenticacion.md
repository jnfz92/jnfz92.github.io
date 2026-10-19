# Acceso, registro y tokens en Easy English

La pantalla **[Mi perfil](https://jnfz92.github.io/perfil.html)** presenta
dos formularios independientes: **Iniciar sesión** a la izquierda y
**Crear una cuenta** a la derecha. En pantallas pequeñas se apilan
verticalmente para conservar la accesibilidad.

## Flujos de autenticación

- **Iniciar sesión:** correo + contraseña mediante
  `supabase.auth.signInWithPassword`. La identidad se vuelve a validar
  con `supabase.auth.getUser()` antes de mostrar datos privados.
- **Registro:** correo, contraseña (mínimo 8 caracteres) y confirmación
  coincidente. Usa `supabase.auth.signUp`; cuando la configuración de
  Supabase exige confirmación, se avisa al alumno de que debe revisar
  su correo. No se da por iniciada una sesión si no hay una sesión real.
- **Recuperación:** enlace enviado por
  `supabase.auth.resetPasswordForEmail`; al regresar con un enlace
  válido de recuperación, `PASSWORD_RECOVERY` permite establecer la
  contraseña con `updateUser`.
- **Cerrar sesión y refrescar token:** la biblioteca oficial Supabase
  se encarga de los tokens de acceso y renovación. Los eventos
  `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED` y `USER_UPDATED`
  sincronizan la pantalla y revalidan el usuario contra el servicio
  de Auth. No hay contraseñas, refresh tokens ni service_role en el HTML.
- **Datos privados:** RLS de Supabase está activado en `public.perfiles`
  y `public.lecturas`; el usuario anónimo no dispone de permisos
  directos de lectura. No se confía en un simple booleano del navegador.

## Configuración necesaria

En **Supabase → Authentication → URL Configuration**, asegúrate de que
`https://jnfz92.github.io/perfil.html` figure entre las URL permitidas
para la redirección después de confirmar el correo o recuperar la
contraseña. Comprueba también la configuración del proveedor Email,
confirmación de correo y entrega SMTP.

## Seguridad y limitaciones

**GitHub Pages sirve HTML estático públicamente**. Esta pantalla de
login protege las funcionalidades que usan autorización y las tablas con
RLS, pero **no restringe físicamente la descarga de todas las páginas y
recursos del sitio**. Para que ninguna página pueda abrirse sin iniciar
sesión, hace falta situarla detrás de un servidor o servicio de acceso
con comprobación de autenticación; una redirección JavaScript por sí
sola no constituye protección real.

No publiques jamás claves de servicio, tokens de usuario ni contraseñas
en el repositorio, las URL de soporte o los informes de fallos.

## Verificación automatizada

Las pruebas `tests/auth-profile.spec.cjs` usan Playwright y responden
localmente a las peticiones de registro, login y recuperación. Por
seguridad **no crean usuarios reales**. Comprueban:
- Dos formularios lado a lado en escritorio y apilados en móvil.
- Validación local de contraseñas distintas sin realizar una petición.
- Envío de registro simulado y confirmación por correo.
- Error de acceso sin mostrar la contraseña.
- Recuperación mediante enlace simulado.
- La ausencia de datos privados sin iniciar sesión.

El pipeline de GitHub Actions ejecuta estas pruebas junto con las demás
pruebas de navegador del sitio.
