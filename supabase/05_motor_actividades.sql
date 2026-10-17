-- Easy English · motor universal de actividades.
-- Publicacion editorial mediante Supabase SQL Editor (sin permisos de escritura del navegador).
CREATE TABLE IF NOT EXISTS public.actividades (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,99}$'),
  titulo text NOT NULL,
  descripcion text,
  destreza text NOT NULL DEFAULT 'use_of_english'
    CHECK (destreza IN ('reading','use_of_english','writing','listening','speaking','vocabulary','grammar')),
  unidad_id bigint REFERENCES public.unidades_curso(id) ON DELETE SET NULL,
  articulo_slug text,
  orden integer NOT NULL DEFAULT 1,
  publicado boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS actividades_unidad_publicado ON public.actividades(unidad_id,publicado,orden);
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.actividades FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.actividades TO anon,authenticated;
CREATE POLICY "Actividades publicadas" ON public.actividades FOR SELECT TO anon,authenticated USING (publicado = true);

CREATE TABLE IF NOT EXISTS public.actividad_preguntas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actividad_id bigint NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  orden integer NOT NULL CHECK (orden > 0),
  tipo text NOT NULL CHECK (tipo IN ('seleccion','texto_corto','huecos','transformacion','redaccion')),
  enunciado text NOT NULL,
  configuracion jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(configuracion) = 'object'),
  medio_tipo text CHECK (medio_tipo IN ('audio','imagen')),
  medio_url text,
  medio_alt text,
  UNIQUE(actividad_id,orden),
  CHECK ((medio_tipo IS NULL AND medio_url IS NULL) OR
         (medio_tipo IS NOT NULL AND medio_url ~ '^https://[^[:space:]]+$'))
);
CREATE INDEX IF NOT EXISTS actividad_preguntas_orden ON public.actividad_preguntas(actividad_id,orden);
ALTER TABLE public.actividad_preguntas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.actividad_preguntas FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.actividad_preguntas TO anon,authenticated;
CREATE POLICY "Preguntas de actividades publicadas"
  ON public.actividad_preguntas FOR SELECT TO anon,authenticated
  USING (EXISTS (SELECT 1 FROM public.actividades a WHERE a.id = actividad_id AND a.publicado = true));

CREATE TABLE IF NOT EXISTS private.actividad_soluciones (
  pregunta_id bigint PRIMARY KEY REFERENCES public.actividad_preguntas(id) ON DELETE CASCADE,
  clave jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(clave) = 'object'),
  explicacion text
);
ALTER TABLE private.actividad_soluciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.actividad_soluciones FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.actividad_intentos (
  id uuid PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actividad_id bigint NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  respuestas jsonb NOT NULL CHECK (jsonb_typeof(respuestas) = 'object'),
  detalle jsonb NOT NULL CHECK (jsonb_typeof(detalle) = 'object'),
  aciertos integer NOT NULL CHECK (aciertos >= 0),
  evaluables integer NOT NULL CHECK (evaluables >= 0),
  pendientes_revision integer NOT NULL CHECK (pendientes_revision >= 0),
  fecha timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS actividad_intentos_usuario_fecha ON public.actividad_intentos(usuario_id,fecha DESC);
ALTER TABLE public.actividad_intentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.actividad_intentos FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.actividad_intentos TO authenticated;
CREATE POLICY "Intentos propios" ON public.actividad_intentos FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = usuario_id);

-- Se permite corregir hasta 50 preguntas publicadas del mismo ejercicio.
-- No se revelan claves privadas antes de entregar el intento.
-- Respuestas de redaccion: pendiente de revision humana, sin nota inventada.
CREATE OR REPLACE FUNCTION public.entregar_actividad(
  p_actividad_id bigint, p_respuestas jsonb, p_intento_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $func$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_total integer; v_enviadas integer; v_aciertos integer := 0;
  v_evaluables integer := 0; v_pendientes integer := 0;
  v_guardado public.actividad_intentos%ROWTYPE;
  v_q record; v_input jsonb; v_clave jsonb;
  v_exp text; v_ok boolean; v_detalle jsonb := '{}'::jsonb;
  v_solucion jsonb; v_estado text;
  v_field jsonb; v_options jsonb;
  v_pos integer; v_match boolean; v_alternativa text;
  v_respuesta_texto text; v_resultado jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Inicia sesion para entregar actividades'; END IF;
  IF p_actividad_id IS NULL OR p_intento_id IS NULL OR
     pg_catalog.jsonb_typeof(p_respuestas) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Datos de actividad invalidos';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text || ':' || p_intento_id::text, 0)
  );
  SELECT * INTO v_guardado FROM public.actividad_intentos
    WHERE id = p_intento_id AND usuario_id = v_user;
  IF FOUND THEN
    IF v_guardado.actividad_id <> p_actividad_id OR v_guardado.respuestas <> p_respuestas THEN
      RAISE EXCEPTION 'Este intento ya se entrego con otras respuestas';
    END IF;
    RETURN pg_catalog.jsonb_build_object('aciertos',v_guardado.aciertos,
      'evaluables',v_guardado.evaluables,'pendientes_revision',v_guardado.pendientes_revision,
      'detalle',v_guardado.detalle,'intento_id',v_guardado.id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.actividades
    WHERE id = p_actividad_id AND publicado = true) THEN
    RAISE EXCEPTION 'Actividad no disponible';
  END IF;
  SELECT count(*)::integer INTO v_total FROM public.actividad_preguntas
    WHERE actividad_id = p_actividad_id;
  SELECT count(*)::integer INTO v_enviadas FROM pg_catalog.jsonb_each(p_respuestas);
  IF v_total NOT BETWEEN 1 AND 50 OR v_enviadas <> v_total THEN
    RAISE EXCEPTION 'Responde todas las preguntas de esta actividad';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_each(p_respuestas) x
    WHERE x.key !~ '^[1-9][0-9]{0,17}$'
      OR NOT EXISTS(SELECT 1 FROM public.actividad_preguntas q
        WHERE q.actividad_id=p_actividad_id AND q.id::text=x.key)
  ) THEN RAISE EXCEPTION 'Las respuestas contienen preguntas ajenas'; END IF;

  FOR v_q IN
    SELECT q.id,q.tipo,q.configuracion,s.clave,s.explicacion
    FROM public.actividad_preguntas q
    LEFT JOIN private.actividad_soluciones s ON s.pregunta_id=q.id
    WHERE q.actividad_id=p_actividad_id ORDER BY q.orden
  LOOP
    v_input := p_respuestas -> v_q.id::text;
    v_clave := v_q.clave;
    v_exp := COALESCE(v_q.explicacion,'');
    v_solucion := NULL; v_ok := false;
    IF v_q.tipo = 'seleccion' THEN
      IF pg_catalog.jsonb_typeof(v_input) <> 'number'
         OR v_input::text !~ '^[0-7]$'
         OR pg_catalog.jsonb_typeof(v_q.configuracion->'opciones') <> 'array'
         OR (v_input::text)::integer >= pg_catalog.jsonb_array_length(v_q.configuracion->'opciones')
         OR pg_catalog.jsonb_typeof(v_clave->'indice') <> 'number' THEN
        RAISE EXCEPTION 'Pregunta %: opcion invalida o sin solucion',v_q.id;
      END IF;
      v_solucion := v_clave->'indice';
      v_ok := v_input = v_solucion;

    ELSIF v_q.tipo IN ('texto_corto','transformacion') THEN
      IF pg_catalog.jsonb_typeof(v_input) <> 'string'
         OR length(v_input #>> '{}') NOT BETWEEN 1 AND 500
         OR pg_catalog.jsonb_typeof(v_clave->'alternativas') <> 'array'
         OR pg_catalog.jsonb_array_length(v_clave->'alternativas') = 0 THEN
        RAISE EXCEPTION 'Pregunta %: respuesta invalida o sin solucion',v_q.id;
      END IF;
      v_respuesta_texto := pg_catalog.lower(pg_catalog.btrim(
        pg_catalog.regexp_replace(v_input #>> '{}','[[:space:]]+',' ','g')));
      FOR v_alternativa IN SELECT pg_catalog.jsonb_array_elements_text(v_clave->'alternativas')
      LOOP
        IF v_respuesta_texto = pg_catalog.lower(pg_catalog.btrim(
          pg_catalog.regexp_replace(v_alternativa,'[[:space:]]+',' ','g'))) THEN
          v_ok := true; EXIT;
        END IF;
      END LOOP;
      v_solucion := v_clave->'alternativas'->0;

    ELSIF v_q.tipo = 'huecos' THEN
      v_options := v_clave->'campos';
      IF pg_catalog.jsonb_typeof(v_input) <> 'array'
         OR pg_catalog.jsonb_typeof(v_q.configuracion->'campos') <> 'array'
         OR pg_catalog.jsonb_typeof(v_options) <> 'array'
         OR pg_catalog.jsonb_array_length(v_input) = 0
         OR pg_catalog.jsonb_array_length(v_input) > 20
         OR pg_catalog.jsonb_array_length(v_input) <> pg_catalog.jsonb_array_length(v_q.configuracion->'campos')
         OR pg_catalog.jsonb_array_length(v_input) <> pg_catalog.jsonb_array_length(v_options) THEN
        RAISE EXCEPTION 'Pregunta %: numero de huecos invalido',v_q.id;
      END IF;
      v_ok := true; v_solucion := '[]'::jsonb;
      FOR v_pos IN 0..pg_catalog.jsonb_array_length(v_input)-1 LOOP
        v_field := v_input->v_pos;
        IF pg_catalog.jsonb_typeof(v_field) <> 'string'
          OR length(v_field #>> '{}') NOT BETWEEN 1 AND 500
          OR pg_catalog.jsonb_typeof(v_options->v_pos) <> 'array'
          OR pg_catalog.jsonb_array_length(v_options->v_pos)=0 THEN
          RAISE EXCEPTION 'Pregunta %: hueco sin respuesta o sin clave',v_q.id;
        END IF;
        v_match := false;
        v_respuesta_texto := pg_catalog.lower(pg_catalog.btrim(
          pg_catalog.regexp_replace(v_field #>> '{}','[[:space:]]+',' ','g')));
        FOR v_alternativa IN SELECT pg_catalog.jsonb_array_elements_text(v_options->v_pos)
        LOOP
          IF v_respuesta_texto = pg_catalog.lower(pg_catalog.btrim(
            pg_catalog.regexp_replace(v_alternativa,'[[:space:]]+',' ','g'))) THEN
            v_match := true; EXIT;
          END IF;
        END LOOP;
        IF NOT v_match THEN v_ok := false; END IF;
        v_solucion := v_solucion || pg_catalog.jsonb_build_array(v_options->v_pos->0);
      END LOOP;

    ELSIF v_q.tipo = 'redaccion' THEN
      IF pg_catalog.jsonb_typeof(v_input) <> 'string'
        OR length(pg_catalog.btrim(v_input #>> '{}')) NOT BETWEEN 1 AND 10000 THEN
        RAISE EXCEPTION 'Pregunta %: redaccion vacia o demasiado larga',v_q.id;
      END IF;
      v_pendientes := v_pendientes + 1;
      v_estado := 'revision';

    ELSE RAISE EXCEPTION 'Tipo de ejercicio no admitido';
    END IF;

    IF v_q.tipo <> 'redaccion' THEN
      v_evaluables := v_evaluables + 1;
      IF v_ok THEN v_aciertos := v_aciertos + 1; END IF;
      v_estado := CASE WHEN v_ok THEN 'correcta' ELSE 'incorrecta' END;
    END IF;
    v_detalle := v_detalle || pg_catalog.jsonb_build_object(v_q.id::text,
      pg_catalog.jsonb_build_object('estado',v_estado,'solucion',v_solucion,'explicacion',v_exp));
  END LOOP;

  INSERT INTO public.actividad_intentos
    (id,usuario_id,actividad_id,respuestas,detalle,aciertos,evaluables,pendientes_revision)
  VALUES (p_intento_id,v_user,p_actividad_id,p_respuestas,v_detalle,v_aciertos,v_evaluables,v_pendientes);
  RETURN pg_catalog.jsonb_build_object('aciertos',v_aciertos,'evaluables',v_evaluables,
    'pendientes_revision',v_pendientes,'detalle',v_detalle,'intento_id',p_intento_id);
END;
$func$;
REVOKE ALL ON FUNCTION public.entregar_actividad(bigint,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.entregar_actividad(bigint,jsonb,uuid) TO authenticated;
