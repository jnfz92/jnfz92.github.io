# Configuración de Easy English Premium

La infraestructura de pagos está desplegada en Supabase. Antes de cobrar a usuarios hay que añadir las claves de Stripe y configurar la cuota mensual.

## 1. Secretos de Supabase

En Supabase → Project Settings / Edge Functions → Secrets, añadir:

- `STRIPE_SECRET_KEY`: clave secreta de Stripe (`sk_test_...` para pruebas; `sk_live_...` para producción).
- `STRIPE_WEBHOOK_SECRET`: secreto de firma del webhook (`whsec_...`).

No guardar estas claves en GitHub, JavaScript del navegador ni en este repositorio.

## 2. Webhook de Stripe

Crear un endpoint webhook con esta URL:

`https://wnluofonzteaqtlfshgy.supabase.co/functions/v1/stripe-webhook`

Suscribirlo a estos eventos:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `charge.refunded`

Copiar el secreto de firma generado por Stripe a `STRIPE_WEBHOOK_SECRET`.

## 3. Definir cuota mensual

La suscripción no tiene una tarifa predeterminada. Elegir el importe y ejecutar en Supabase SQL Editor:

```sql
-- Ejemplo: 5,99 EUR al mes (599 céntimos)
update public.configuracion_pagos
set suscripcion_mensual_cents = 599, actualizado_en = now()
where id = true;
```

## 4. Marcar artículos como Premium y fijar precio

Los artículos actuales siguen siendo gratuitos hasta que se marquen expresamente.

```sql
-- Ejemplo: artículo a 2,99 EUR
update public.articulos
set es_premium = true, precio_cents = 299
where slug = 'conditionals-ingles-guia-completa-ejercicios';

-- Volver a hacerlo gratuito
update public.articulos
set es_premium = false
where slug = 'conditionals-ingles-guia-completa-ejercicios';
```

El catálogo público se sincroniza automáticamente. El precio se expresa en céntimos de euro.

## 5. Funciones desplegadas

- `crear-checkout`: inicia una compra individual o suscripción; requiere sesión de usuario.
- `stripe-webhook`: confirma pagos y sincroniza compras/suscripciones con la base de datos.
- `portal-suscripcion`: abre el portal de Stripe para gestionar/cancelar la suscripción.

Activar el Customer Portal desde el Dashboard de Stripe para permitir que los clientes gestionen sus suscripciones.

## 6. Pruebas antes de producción

1. Configurar primero claves `sk_test_` y webhook de prueba.
2. Configurar cuota mensual y marcar un artículo de prueba como Premium.
3. Completar una compra de prueba y verificar que el artículo se desbloquea después del webhook.
4. Probar cancelación de suscripción y comprobar que el acceso finaliza al terminar el periodo pagado.
5. Cambiar a claves `sk_live_` y webhook de producción solo después de validar todo.

El acceso al contenido completo se controla mediante RLS en Supabase; no depende de ocultar texto con JavaScript.
