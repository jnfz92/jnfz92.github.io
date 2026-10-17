-- Progreso comun de Easy English: errores de nuevas actividades y repaso seguro.
-- No se modifican resultados/notas de los examenes tradicionales.

CREATE TABLE public.actividad_fallos (
 usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 pregunta_id bigint NOT NULL REFERENCES public.actividad_preguntas(id) ON DELETE CASCADE,
 veces_fallada integer NOT NULL DEFAULT 1 CHECK(veces_fallada > 0),
 ultima_respuesta jsonb,
 ultimo_fallo timestamptz NOT NULL DEFAULT now(),
 dominada boolean NOT NULL DEFAULT false,
 PRIMARY KEY(usuario_id,pregunta_id)
);
CREATE INDEX actividad_fallos_usuario_pendientes
 ON public.actividad_fallos(usuario_id,dominada,ultimo_fallo DESC);
ALTER TABLE public.actividad_fallos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.actividad_fallos FROM public,anon,authenticated;
GRANT SELECT ON public.actividad_fallos TO authenticated;
CREATE POLICY "Cada alumno consulta sus fallos de actividades"
 ON public.actividad_fallos FOR SELECT TO authenticated
 USING ((SELECT auth.uid()) = usuario_id);

-- Los fallos se actualizan EXCLUSIVAMENTE cuando Supabase registra un intento real.
-- Reenviar el mismo intento no duplica los errores, porque no inserta una segunda fila.
CREATE OR REPLACE FUNCTION private.registrar_fallos_actividades()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_item record; v_state text; v_answer jsonb;
BEGIN
 FOR v_item IN SELECT key,value FROM pg_catalog.jsonb_each(NEW.detalle)
 LOOP
   v_state := v_item.value ->> 'estado';
   v_answer := NEW.respuestas -> v_item.key;
   IF v_state = 'incorrecta' THEN
     INSERT INTO public.actividad_fallos
       (usuario_id,pregunta_id,veces_fallada,ultima_respuesta,ultimo_fallo,dominada)
     VALUES(NEW.usuario_id,v_item.key::bigint,1,v_answer,NEW.fecha,false)
     ON CONFLICT(usuario_id,pregunta_id) DO UPDATE SET
       veces_fallada = public.actividad_fallos.veces_fallada+1,
       ultima_respuesta = EXCLUDED.ultima_respuesta,
       ultimo_fallo = EXCLUDED.ultimo_fallo, dominada=false;
   ELSIF v_state = 'correcta' THEN
     UPDATE public.actividad_fallos SET dominada=true
       WHERE usuario_id=NEW.usuario_id AND pregunta_id=v_item.key::bigint;
   END IF;
   -- Estado 'revision': una redaccion no es un error autocorregible.
 END LOOP;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION private.registrar_fallos_actividades() FROM public,anon,authenticated;
CREATE TRIGGER registrar_fallos_actividades
 AFTER INSERT ON public.actividad_intentos
 FOR EACH ROW EXECUTE FUNCTION private.registrar_fallos_actividades();

CREATE TABLE private.intentos_repaso_actividades (
 intento_id uuid PRIMARY KEY,
 usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 respuestas jsonb NOT NULL CHECK(jsonb_typeof(respuestas)='object'),
 resultado jsonb NOT NULL CHECK(jsonb_typeof(resultado)='object'),
 creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX intentos_repaso_actividades_usuario
 ON private.intentos_repaso_actividades(usuario_id,creado_en DESC);
ALTER TABLE private.intentos_repaso_actividades ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.intentos_repaso_actividades FROM public,anon,authenticated;

-- Una tanda admite preguntas de cualquier actividad publicada.
-- Se corrigen tipos objetivos; las redacciones mantienen la revision humana.
CREATE OR REPLACE FUNCTION public.entregar_repaso_actividades(
 p_intento_id uuid, p_respuestas jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_user uuid := (SELECT auth.uid());
 v_saved jsonb; v_cached jsonb; v_count integer; v_valid integer;
 v_row record; v_answer jsonb; v_good boolean; v_solution jsonb;
 v_feedback jsonb := '{}'::jsonb; v_result jsonb;
 v_correct integer := 0; v_normal text; v_alt text;
 v_fields jsonb; v_value jsonb; v_pos integer; v_field_good boolean;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Inicia sesion para repasar'; END IF;
 IF p_intento_id IS NULL OR pg_catalog.jsonb_typeof(p_respuestas) <> 'object'
 THEN RAISE EXCEPTION 'Entrega de repaso invalida'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(v_user::text||':actividades:'||p_intento_id::text,0)
 );
 SELECT respuestas,resultado INTO v_saved,v_cached
 FROM private.intentos_repaso_actividades
 WHERE intento_id=p_intento_id AND usuario_id=v_user;
 IF FOUND THEN
   IF v_saved IS DISTINCT FROM p_respuestas THEN
     RAISE EXCEPTION 'Este intento ya se entrego con otras respuestas';
   END IF;
   RETURN v_cached;
 END IF;
 SELECT count(*)::integer INTO v_count FROM pg_catalog.jsonb_each(p_respuestas);
 IF v_count NOT BETWEEN 1 AND 20 THEN
   RAISE EXCEPTION 'Selecciona entre 1 y 20 preguntas';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_respuestas) x
   WHERE x.key !~ '^[1-9][0-9]{0,17}$') THEN
   RAISE EXCEPTION 'Identificador de pregunta invalido';
 END IF;
 -- Se bloquean todos los fallos pendientes antes de corregir.
 PERFORM f.pregunta_id FROM public.actividad_fallos f
 WHERE f.usuario_id=v_user AND f.pregunta_id::text IN
   (SELECT x.key FROM pg_catalog.jsonb_each(p_respuestas) x)
 ORDER BY f.pregunta_id FOR UPDATE OF f;
 SELECT count(*)::integer INTO v_valid
 FROM pg_catalog.jsonb_each(p_respuestas) x
 JOIN public.actividad_fallos f ON f.pregunta_id::text=x.key
   AND f.usuario_id=v_user AND f.dominada=false
 JOIN public.actividad_preguntas q ON q.id=f.pregunta_id
 JOIN public.actividades a ON a.id=q.actividad_id AND a.publicado=true
 JOIN private.actividad_soluciones s ON s.pregunta_id=q.id
 WHERE q.tipo IN('seleccion','texto_corto','huecos','transformacion');
 IF v_valid<>v_count THEN
   RAISE EXCEPTION 'Pregunta ya superada, ajena o no publicada';
 END IF;
 FOR v_row IN
   SELECT q.id,q.tipo,q.configuracion,s.clave,s.explicacion,
     x.value AS respuesta
   FROM pg_catalog.jsonb_each(p_respuestas) x
   JOIN public.actividad_preguntas q ON q.id::text=x.key
   JOIN private.actividad_soluciones s ON s.pregunta_id=q.id
   ORDER BY q.id
 LOOP
   v_answer := v_row.respuesta;
   v_good := false; v_solution := NULL;
   IF v_row.tipo='seleccion' THEN
     IF pg_catalog.jsonb_typeof(v_answer)<>'number'
       OR v_answer::text !~ '^[0-7]$'
       OR pg_catalog.jsonb_typeof(v_row.configuracion->'opciones')<>'array'
       OR (v_answer::text)::integer >= pg_catalog.jsonb_array_length(v_row.configuracion->'opciones')
       OR pg_catalog.jsonb_typeof(v_row.clave->'indice')<>'number'
     THEN RAISE EXCEPTION 'Opcion no valida para %',v_row.id; END IF;
     v_solution := v_row.clave->'indice';
     v_good := v_answer=v_solution;
   ELSIF v_row.tipo IN('texto_corto','transformacion') THEN
     IF pg_catalog.jsonb_typeof(v_answer)<>'string'
       OR length(v_answer#>>'{}') NOT BETWEEN 1 AND 500
       OR pg_catalog.jsonb_typeof(v_row.clave->'alternativas')<>'array'
       OR pg_catalog.jsonb_array_length(v_row.clave->'alternativas')=0
     THEN RAISE EXCEPTION 'Respuesta no valida para %',v_row.id; END IF;
     v_normal := pg_catalog.lower(pg_catalog.btrim(
       pg_catalog.regexp_replace(v_answer#>>'{}','[[:space:]]+',' ','g')));
     FOR v_alt IN SELECT pg_catalog.jsonb_array_elements_text(v_row.clave->'alternativas')
     LOOP
       IF v_normal = pg_catalog.lower(pg_catalog.btrim(
           pg_catalog.regexp_replace(v_alt,'[[:space:]]+',' ','g'))) THEN
         v_good:=true; EXIT;
       END IF;
     END LOOP;
     v_solution := v_row.clave->'alternativas'->0;
   ELSIF v_row.tipo='huecos' THEN
     v_fields := v_row.clave->'campos';
     IF pg_catalog.jsonb_typeof(v_answer)<>'array'
       OR pg_catalog.jsonb_typeof(v_row.configuracion->'campos')<>'array'
       OR pg_catalog.jsonb_typeof(v_fields)<>'array'
       OR pg_catalog.jsonb_array_length(v_answer)=0
       OR pg_catalog.jsonb_array_length(v_answer)>20
       OR pg_catalog.jsonb_array_length(v_answer)<>pg_catalog.jsonb_array_length(v_fields)
       OR pg_catalog.jsonb_array_length(v_answer)<>pg_catalog.jsonb_array_length(v_row.configuracion->'campos')
     THEN RAISE EXCEPTION 'Huecos no validos para %',v_row.id; END IF;
     v_good:=true;v_solution:='[]'::jsonb;
     FOR v_pos IN 0..pg_catalog.jsonb_array_length(v_answer)-1 LOOP
       v_value := v_answer->v_pos;
       IF pg_catalog.jsonb_typeof(v_value)<>'string'
         OR length(v_value#>>'{}') NOT BETWEEN 1 AND 500
         OR pg_catalog.jsonb_typeof(v_fields->v_pos)<>'array'
         OR pg_catalog.jsonb_array_length(v_fields->v_pos)=0
       THEN RAISE EXCEPTION 'Hueco no valido para %',v_row.id; END IF;
       v_normal := pg_catalog.lower(pg_catalog.btrim(
         pg_catalog.regexp_replace(v_value#>>'{}','[[:space:]]+',' ','g')));
       v_field_good:=false;
       FOR v_alt IN SELECT pg_catalog.jsonb_array_elements_text(v_fields->v_pos)
       LOOP
         IF v_normal = pg_catalog.lower(pg_catalog.btrim(
            pg_catalog.regexp_replace(v_alt,'[[:space:]]+',' ','g'))) THEN
           v_field_good:=true;EXIT;
         END IF;
       END LOOP;
       IF NOT v_field_good THEN v_good:=false; END IF;
       v_solution:=v_solution||pg_catalog.jsonb_build_array(v_fields->v_pos->0);
     END LOOP;
   ELSE RAISE EXCEPTION 'Tipo de respuesta no evaluable'; END IF;
   IF v_good THEN
     v_correct:=v_correct+1;
     UPDATE public.actividad_fallos SET dominada=true
       WHERE usuario_id=v_user AND pregunta_id=v_row.id;
   ELSE
     UPDATE public.actividad_fallos SET
       veces_fallada=veces_fallada+1,ultima_respuesta=v_answer,
       ultimo_fallo=now(),dominada=false
       WHERE usuario_id=v_user AND pregunta_id=v_row.id;
   END IF;
   v_feedback:=v_feedback||pg_catalog.jsonb_build_object(
     v_row.id::text,pg_catalog.jsonb_build_object(
       'estado',CASE WHEN v_good THEN 'correcta' ELSE 'incorrecta' END,
       'solucion',v_solution,'explicacion',coalesce(v_row.explicacion,'')));
 END LOOP;
 v_result:=pg_catalog.jsonb_build_object(
   'aciertos',v_correct,'total',v_count,'correcciones',v_feedback
 );
 INSERT INTO private.intentos_repaso_actividades
   (intento_id,usuario_id,respuestas,resultado)
 VALUES(p_intento_id,v_user,p_respuestas,v_result);
 RETURN v_result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.entregar_repaso_actividades(uuid,jsonb) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.entregar_repaso_actividades(uuid,jsonb) TO authenticated;
