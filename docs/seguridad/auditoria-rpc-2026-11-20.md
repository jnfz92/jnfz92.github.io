# Auditoría de RPC SECURITY DEFINER — Easy English

- Fecha de inspección: 2026-11-20
- Proyecto inspeccionado: `wnluofonzteaqtlfshgy` (producción)
- Motor: PostgreSQL 17.6
- Método: consultas de solo lectura a `pg_proc`, privilegios efectivos y definiciones de funciones; contraste con el cliente web.
- Alcance: funciones `SECURITY DEFINER` en `public`, más la función privilegiada relevante en `private`.
- **No se ha ejecutado DDL ni se han cambiado permisos o datos en Supabase.**

> Este informe es una auditoría estática. La presencia de `auth.uid()` o de un `search_path` fijo no demuestra por sí sola que cada ruta de autorización sea correcta. Los hallazgos marcados como pendientes requieren pruebas con identidades reales en un proyecto aislado antes de desplegar una migración.

## Resumen ejecutivo

Se identificaron 29 funciones `SECURITY DEFINER` en `public` ejecutables por `authenticated`. Cuatro de ellas también son ejecutables por `anon` y corresponden al sistema público de sugerencias y comentarios.

Hallazgos principales:

1. **Alto — `public.battle_finalize(uuid)` no comprueba que el usuario autenticado pertenezca a la sala.** La función comprueba que exista una sesión, pero no valida que `auth.uid()` sea anfitrión o jugador aceptado de `p_room`. Como es `SECURITY DEFINER` y ejecutable por `authenticated`, cualquier cuenta autenticada puede invocarla directamente sobre una sala ajena y provocar la finalización cuando se cumplan sus condiciones temporales/de envío. Las llamadas legítimas desde `battle_save` y `battle_state` ya están precedidas por comprobaciones de pertenencia, pero eso no protege la invocación directa de la RPC.
2. **Alto — `public.votar_sugerencia` confía en un UUID de votante controlado por el cliente.** El navegador lo genera y guarda en `localStorage`; cualquiera puede sustituirlo y votar usando identidades distintas. No es una identidad autenticada ni un mecanismo antiabuso.
3. **Medio — `public.listar_sugerencias` también acepta ese UUID de cliente** para calcular `mi_voto`. El dato permite suplantar la identidad de voto mostrada, aunque no modifica por sí mismo los votos.
4. **Medio — `public.enviar_sugerencia` permite inserciones anónimas con validación de longitud, pero sin límite de frecuencia visible en el cuerpo.** Es susceptible de spam automatizado.
5. **Bajo/pendiente — `public.listar_comentarios_articulo` es una lectura pública intencionada.** Filtra comentarios ocultos y limita la respuesta a 500 filas. El frontend usa nodos de texto para mostrar contenido, evitando interpretarlo como HTML. Conviene conservar pruebas de estos invariantes y revisar paginación/abuso de lectura.

Todas las funciones públicas inspeccionadas tienen `SET search_path TO ''`. No se encontró SQL dinámico (`EXECUTE`) en el escaneo de cuerpos realizado. Esto reduce riesgos, pero no sustituye la autorización por recurso.

## Detalle de las cuatro RPC ejecutables por anon

| Función | Acceso efectivo | Comportamiento observado | Evaluación |
|---|---|---|---|
| `enviar_sugerencia(text,text)` | anon, authenticated, service_role | Inserta sugerencia; título 5–100 y descripción 10–1000 caracteres | Mantener pública solo si se acepta envío anónimo; falta mitigación de abuso |
| `listar_comentarios_articulo(text)` | anon, authenticated, service_role | Devuelve comentarios no ocultos, anonimiza eliminados y limita a 500 | Pública por diseño; comprobar contenido y límites |
| `listar_sugerencias(uuid)` | anon, authenticated, service_role | Devuelve sugerencias publicadas y calcula `mi_voto` usando el UUID recibido | La identidad declarada por el navegador es falsificable |
| `votar_sugerencia(bigint,uuid,smallint)` | anon, authenticated, service_role | Inserta/actualiza el voto usando `p_votante_id`; admite -1 o 1 | Suplantación de votante y manipulación de recuentos posibles |

### Contraste con el frontend

En `assets/sugerencias.js`:

- `getVoterId()` crea un UUID aleatorio y lo persiste en `localStorage` bajo `easyenglish.sugerencias.votante.v1`.
- `listar_sugerencias` y `votar_sugerencia` envían ese valor como `p_votante_id`.
- Las cuatro RPC se llaman con la clave pública `publishable` y sin sesión de usuario.
- Los títulos y descripciones se renderizan con `textContent`, no como HTML.

**Conclusión:** el UUID local sirve como identificador de conveniencia por navegador, no como prueba de identidad. No se debe presentar el sistema actual como resistente a votos duplicados o coordinados.

## Hallazgo alto: finalización de salas de batalla

### Función afectada

`public.battle_finalize(p_room uuid)`

La definición actual:

- Rechaza llamadas sin sesión (`auth.uid() IS NULL`).
- Busca y bloquea la sala.
- No comprueba que el usuario sea anfitrión ni jugador aceptado.
- Actualiza puntuaciones y el estado de la sala cuando se cumplen las condiciones de finalización.

La función tiene privilegio `EXECUTE` para `authenticated` y se ejecuta como su propietario. Por tanto, la comprobación de sesión no basta para proteger la sala indicada por el parámetro.

### Corrección propuesta

Antes de leer/modificar la sala, exigir que el usuario actual sea jugador aceptado en esa sala:

```sql
IF auth.uid() IS NULL OR NOT EXISTS (
  SELECT 1
  FROM public.battle_players
  WHERE room_id = p_room
    AND user_id = auth.uid()
    AND status = 'accepted'
) THEN
  RAISE EXCEPTION 'Forbidden';
END IF;
```

La condición es compatible con las rutas internas observadas: `battle_state` ya verifica que el usuario sea jugador aceptado y `battle_save` actualiza la respuesta solo para el jugador actual antes de llamar a la función. Aun así, debe probarse en un entorno aislado, incluyendo el flujo de anfitrión, jugador aceptado, jugador pendiente, usuario ajeno y llamada sin sesión.

## Revisión del resto de funciones públicas privilegiadas

Las siguientes 24 funciones adicionales (además de `battle_finalize`) son ejecutables por `authenticated`, no por `anon`, en la inspección realizada:

| Función | Control que debe conservarse / probarse |
|---|---|
| `battle_can_see_room(uuid)` | Solo devuelve true si existe sesión y el usuario pertenece a la sala |
| `battle_create_room(text,text,integer,integer,text)` | Exige usuario registrado; valida configuración y crea sala para `auth.uid()` |
| `battle_decide_player(uuid,uuid,boolean)` | Comprueba que el usuario actual sea anfitrión de la sala en espera |
| `battle_join_room(text,text)` | Exige sesión; une al usuario actual, no al UUID aportado por cliente |
| `battle_save(uuid,jsonb,boolean)` | Actualiza la respuesta del usuario actual y valida estado/ventana temporal |
| `battle_start(uuid)` | Comprueba anfitrión y estado; bloquea la sala |
| `battle_state(uuid)` | Comprueba jugador aceptado antes de devolver estado/preguntas |
| `eliminar_comentario_articulo(bigint)` | Probar propiedad del comentario y excepción de moderación |
| `entregar_actividad(bigint,jsonb,uuid)` | Revisar vinculación del intento y propiedad del usuario en todas las ramas |
| `entregar_examen(bigint,jsonb)` | Revisar propiedad del intento y acceso al examen |
| `entregar_examen_idempotente(bigint,jsonb,uuid)` | Revisar idempotencia, propietario y reutilización de UUID |
| `entregar_examen_lecturas(uuid,jsonb)` | Revisar que el intento pertenece al usuario actual |
| `entregar_repaso_actividades(uuid,jsonb)` | Revisar que el intento pertenece al usuario actual |
| `entregar_repaso_fallos(uuid,jsonb)` | Revisar que el intento pertenece al usuario actual |
| `enviar_solicitud_mensaje(uuid,text)` | Destinatario validado; remitente debe derivarse de `auth.uid()`; revisar límites |
| `es_profesor_del_curso(bigint)` | La identidad del profesor se deriva de `auth.uid()` |
| `iniciar_examen_lecturas(integer)` | El usuario y lecturas se derivan de `auth.uid()`; validar selección de preguntas |
| `publicar_comentario_articulo(text,bigint,text)` | Exige sesión, artículo válido, padre del mismo artículo y límites temporales |
| `puede_mensajear(uuid,uuid)` | Comprueba que el primer UUID coincide con `auth.uid()` |
| `registrar_racha(text)` | Usuario derivado de `auth.uid()`; origen validado |
| `responder_solicitud_mensaje(bigint,boolean)` | Actualiza solo solicitud cuyo destinatario es `auth.uid()` |
| `seguimiento_mutuo(uuid,uuid)` | Comprueba que el primer UUID coincide con `auth.uid()` |
| `tiene_permiso(text)` | Consulta roles del usuario actual; mantener acceso de lectura limitado |
| `ver_correccion(bigint)` | Comprueba que el resultado pertenece a `auth.uid()` |

El escaneo estático encontró `auth.uid()` en el cuerpo de estas funciones y no encontró `EXECUTE` dinámico. La tabla anterior es una guía de invariantes a verificar, no una certificación individual de todas las rutas.

## Funciones privadas

`private.puede_leer_articulo_premium(text)` es `SECURITY DEFINER` y tiene privilegios efectivos de ejecución para anon/authenticated. El esquema `private` no forma parte de la API REST pública habitual. Mantenerlo fuera de los esquemas expuestos y revisar el privilegio `USAGE` del esquema; la función deriva la compra/suscripción de `auth.uid()`, no de un UUID recibido.

Las funciones privadas de trigger observadas tienen ejecución restringida al propietario y no deben exponerse como RPC.

## Plan de corrección seguro

1. Preparar una migración para añadir la comprobación de pertenencia en `battle_finalize`.
2. Crear pruebas SQL de autorización con dos usuarios y dos salas: anfitrión, jugador aceptado, jugador pendiente, tercero autenticado y llamada anónima.
3. Decidir el modelo de identidad de votos:
   - Opción recomendada si se necesita integridad: exigir sesión autenticada y derivar el votante de `auth.uid()`.
   - Si se desea conservar voto anónimo: mover la emisión/validación de un identificador firmado a un backend/Edge Function con secreto; un UUID de `localStorage` no sirve para evitar suplantación.
4. Añadir rate limiting y controles antiabuso a `enviar_sugerencia` antes de mantenerlo como endpoint anónimo.
5. Mantener públicas solo las lecturas/escrituras anónimas deliberadas; revocar `EXECUTE` a roles que no necesiten cada RPC, incluyendo `PUBLIC` cuando proceda.
6. Ejecutar Security Advisor y pruebas de regresión después de desplegar la migración.

## Estado de cambios

- Revisión de producción: solo lectura.
- Cambios de esquema/permisos en producción: ninguno.
- Migraciones aplicadas: ninguna.
- Riesgo alto identificado: `battle_finalize` carece de comprobación de pertenencia a sala.
- Decisiones funcionales pendientes: identidad de voto anónimo y política anti-spam de sugerencias.

No se recomienda aplicar una corrección en producción sin ejecutar primero las pruebas de autorización en un entorno aislado.
