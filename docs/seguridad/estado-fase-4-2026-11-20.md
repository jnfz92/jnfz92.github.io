# Fase 4 — estado de correcciones y verificación

Fecha de comprobación: 2026-11-20  
Proyecto observado: `wnluofonzteaqtlfshgy` (producción).  
Alcance de esta comprobación: solo lectura; no se ha ejecutado DDL ni se han cambiado permisos o datos.

## Resultado: no desplegar una migración de battle_finalize a ciegas

La auditoría inicial del 20-11-2026 describía `public.battle_finalize(uuid)` sin comprobación de pertenencia. Una lectura posterior de `pg_get_functiondef` en producción confirma que la definición actual **sí contiene** la condición:

- `auth.uid()` no puede ser nulo.
- Debe existir una fila en `public.battle_players` para `room_id = p_room`, `user_id = auth.uid()` y `status = 'accepted'`.
- La función conserva `SECURITY DEFINER` y `SET search_path TO ''`.
- Los privilegios observados son `EXECUTE` para `authenticated` y `service_role`; no para `anon`.

Por tanto, el hallazgo original de `battle_finalize` está **corregido en la definición actualmente desplegada**, pero no se ha localizado todavía una migración versionada que explique ese cambio. No se debe sobrescribir la función ni generar una migración redundante hasta reconciliar el historial de migraciones con el estado real.

Se ha añadido una comprobación SQL estructural en `supabase/tests/security/phase4_rpc_hardening.sql`. Verifica la presencia de la guarda, el `search_path` vacío y los privilegios. No sustituye pruebas funcionales con dos usuarios y salas distintas.

## Pendiente: identidad de los votos

La inspección actual confirma que `listar_sugerencias(uuid)` y `votar_sugerencia(bigint,uuid,smallint)` siguen aceptando un UUID de votante enviado por el navegador. `assets/sugerencias.js` lo genera y conserva en `localStorage`.

Ese UUID es falsificable. Cambiarlo por `auth.uid()` cerraría la suplantación, pero también convertiría el voto en una función solo para usuarios autenticados y cambiaría el comportamiento anónimo existente. No se ha aplicado ese cambio funcional sin definir la política de producto. Para mantener voto anónimo resistente a suplantación se necesita una identidad emitida y validada en servidor (y controles antiabuso); un UUID local no es suficiente.

## Pendiente: abuso de envíos anónimos

`enviar_sugerencia(text,text)` sigue siendo ejecutable por `anon` y solo valida longitudes. Una limitación por IP no puede implementarse de forma fiable desde esta RPC con los datos actuales. Se necesita colocar el envío detrás de un servicio de confianza con rate limiting y, preferiblemente, una verificación anti-bot (por ejemplo, Turnstile) antes de mantener el endpoint anónimo.

## Hallazgo crítico que requiere decisión antes de cambiar RLS

El Security Advisor vuelve a detectar `editorial_archive.articulos_pre_consolidacion_20261030` con RLS desactivado. El propio Advisor advierte que habilitar RLS sin políticas bloquearía accesos; no se ha aplicado automáticamente. Aunque el inventario previo indicaba que `anon` y `authenticated` no tenían `USAGE` en ese esquema ni `SELECT` en esa tabla, sigue siendo necesario revisar propietarios, grants efectivos y uso operativo antes de definir la política o aislarla.

También siguen apareciendo 10 tablas con RLS habilitado y sin políticas. Esto puede ser intencionado para tablas privadas accesibles solo por funciones privilegiadas; no se deben añadir políticas genéricas. El Advisor señala además 16 tablas visibles en GraphQL para `anon` y 59 para `authenticated`; visibilidad del esquema no equivale por sí sola a lectura efectiva cuando RLS y grants la impiden, por lo que se requiere revisión objeto por objeto.

## Secuencia segura pendiente

1. Ejecutar el test estructural de `battle_finalize` en una base local/aislada y añadir pruebas de comportamiento con anfitrión, jugador aceptado, jugador pendiente, tercero y llamada anónima.
2. Decidir explícitamente si el voto debe exigir cuenta autenticada o si se conserva anónimo mediante identidad firmada en servidor.
3. Diseñar e implementar el rate limiting del envío anónimo en un backend de confianza.
4. Reconciliar las migraciones registradas en producción con las migraciones realmente versionadas en Git antes de añadir DDL.
5. Auditar las 10 tablas sin políticas, las exposiciones GraphQL y las 29 RPC `SECURITY DEFINER` con pruebas de aislamiento por rol.
6. Revisar la tabla histórica de `editorial_archive` y decidir su retención/aislamiento antes de activar RLS.
7. Activar la protección de contraseñas filtradas en Auth desde la configuración del proyecto tras validar el impacto operativo.

## Estado de producción

- Consultas realizadas: solo lectura.
- DDL, GRANT/REVOKE y cambios de datos: ninguno.
- Migraciones aplicadas desde esta tarea: ninguna.
- `battle_finalize`: guarda de pertenencia confirmada en la definición actual; origen/versionado del cambio pendiente.
- Votos y envíos anónimos: pendientes de decisión de arquitectura y pruebas.
