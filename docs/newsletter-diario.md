# Newsletter diario de Easy English

## Funcionamiento

Los visitantes se suscriben desde `newsletter.html` aceptando explícitamente recibir novedades. Un email con enlace de confirmación (válido por 48 horas) comprueba que la dirección les pertenece. Ninguna dirección no confirmada recibe boletines. Los emails posteriores incluyen un enlace de baja.

Se envía **un único resumen por suscriptor al día** cuando hay artículos nuevos. Los días sin novedades no se envía nada. La ejecución programada está en `.github/workflows/newsletter-diario.yml`, a las **08:00 UTC** (10:00 en horario de verano de España y 09:00 en invierno, aproximadamente: GitHub puede retrasar trabajos).

La columna `public.articulos.newsletter_publicado_en` registra la inserción de futuros artículos; los 145 artículos históricos conservarán el valor `NULL`, para no enviar un boletín masivo al comenzar. Los mensajes no se envían por ediciones de artículos antiguos.

## Activación (requiere el propietario)

**No habilitar formularios públicos antes de configurar un remitente verificado y el trabajo programado.** La interfaz consulta el estado del servicio y muestra un aviso de «preparando» cuando todavía no está listo.

1. Crear cuenta en [Resend](https://resend.com), verificar un dominio de envío propio mediante DNS y crear una clave de envío. No sirve usar `jnfz92.github.io` como dominio de envío.
2. En **Supabase → Project Settings → Edge Functions → Secrets**, definir **sin escribir sus valores en GitHub ni en esta documentación**:
   - `RESEND_API_KEY`: clave del proveedor.
   - `NEWSLETTER_FROM`: remitente verificado, por ejemplo `Easy English <boletin@TUDOMINIO.COM>`.
   - `NEWSLETTER_LINK_SECRET`: secreto aleatorio largo (al menos 32 bytes) para firmar enlaces de baja.
   - `NEWSLETTER_CRON_SECRET`: otro secreto aleatorio, distinto del anterior.
   - `NEWSLETTER_ENABLED=true`: **ponerlo en true solo tras confirmar todas las demás configuraciones.**
3. En **GitHub → repositorio → Settings → Secrets and variables → Actions**, crear el secreto `NEWSLETTER_CRON_SECRET` con el mismo valor que en Supabase. El trabajo diario lo enviará mediante HTTPS a la función de Supabase.
4. Desplegar la función `newsletter` con `verify_jwt=false`: está pensada para lectores anónimos; el propio código comprueba el secreto administrativo en `action=dispatch`. Código: `supabase/functions/newsletter/index.ts`.
5. Confirmar el funcionamiento haciendo una suscripción de prueba y siguiendo el enlace recibido. Crear un artículo de prueba **solo cuando sea oportuno** y comprobar un boletín manual con la acción de GitHub Actions «Run workflow». No exponer listas de emails en registros.
6. Revisar que los artículos se inserten en `public.articulos` sin forzar `newsletter_publicado_en=NULL`: el valor predeterminado en inserciones nuevas es `now()`.

## Cuotas y precauciones

Resend Free permite actualmente **100 emails/día y 3.000/mes**. Tanto las confirmaciones como los digest consumen cuota. El trabajo envía como máximo 45 resúmenes por ejecución, y guarda un registro diario para evitar duplicaciones. Si se superan 45 suscriptores con material nuevo, hay que ampliar el sistema con lotes y más ejecuciones para entregar a todos puntualmente. Para una audiencia mayor, considerar un servicio especializado y políticas de supresión de rebotes y quejas.

El formulario no muestra direcciones públicas, y sus tablas tienen RLS activado sin permisos para `anon` o `authenticated`. El envío y la confirmación se realizan por una Edge Function con clave de servicio solo en el servidor. Los usuarios pueden borrar su suscripción mediante el enlace de baja; los registros históricos de envío deben purgarse conforme a la política de retención de datos que adopte el proyecto.

El proveedor debe estar configurado antes de aceptar altas. No reactivar antiguos suscriptores dados de baja sin un nuevo doble opt-in; no importar direcciones sin consentimiento. Para un uso comercial, comprobar el cumplimiento aplicable del RGPD/LSSI y disponer de una política de privacidad adecuada.

## Archivos
- `supabase/16_newsletter_diario.sql`: registros privados y marca temporal de nuevas publicaciones.
- `supabase/functions/newsletter/index.ts`: email de confirmación, alta y baja, generación de digest y envío por Resend.
- `newsletter.html`, `assets/newsletter.js`, `assets/newsletter.css`: página y formularios.
- `.github/workflows/newsletter-diario.yml`: trabajo programado con credencial en GitHub Secrets.
- `tests/newsletter.spec.cjs`: controles de consentimiento y confirmación con servidor simulado.
