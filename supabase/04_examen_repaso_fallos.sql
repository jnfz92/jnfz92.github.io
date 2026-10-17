-- Examen de repaso de errores de Easy English (produccion).
-- Cada intento se corrige en el servidor, solo para preguntas pendientes del alumno.
-- Las calificaciones originales de public.resultados permanecen intactas.

CREATE TABLE IF NOT EXISTS private.intentos_repaso_fallos (
  intento_id uuid PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  respuestas jsonb NOT NULL CHECK (jsonb_typeof(respuestas) = 'object'),
  resultado jsonb NOT NULL CHECK (jsonb_typeof(resultado) = 'object'),
  aciertos integer NOT NULL CHECK (aciertos >= 0),
  total integer NOT NULL CHECK (total BETWEEN 1 AND 20),
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS intentos_repaso_fallos_usuario_fecha
  ON private.intentos_repaso_fallos(usuario_id, creado_en DESC);
ALTER TABLE private.intentos_repaso_fallos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.intentos_repaso_fallos FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.entregar_repaso_fallos(
  p_intento_id uuid, p_respuestas jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_count integer;
  v_valid integer;
  v_cached jsonb;
  v_saved jsonb;
  v_correcciones jsonb := '{}'::jsonb;
  v_resultado jsonb;
  v_aciertos integer := 0;
  v_correcta boolean;
  v_item record;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Inicia sesion para corregir el repaso';
  END IF;
  IF p_intento_id IS NULL OR pg_catalog.jsonb_typeof(p_respuestas) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Datos de repaso invalidos';
  END IF;
  -- Una misma entrega no puede aplicarse dos veces tras un corte de red.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text || ':' || p_intento_id::text, 0)
  );
  SELECT i.resultado, i.respuestas INTO v_cached, v_saved
    FROM private.intentos_repaso_fallos i
    WHERE i.intento_id = p_intento_id AND i.usuario_id = v_user;
  IF FOUND THEN
    IF v_saved IS DISTINCT FROM p_respuestas THEN
      RAISE EXCEPTION 'Este intento ya se entrego con otras respuestas';
    END IF;
    RETURN v_cached;
  END IF;

  SELECT count(*)::integer INTO v_count FROM pg_catalog.jsonb_each(p_respuestas);
  IF v_count NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Selecciona entre 1 y 20 preguntas pendientes';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_each(p_respuestas) x
    WHERE x.key !~ '^[1-9][0-9]{0,17}$'
       OR pg_catalog.jsonb_typeof(x.value) <> 'number'
       OR x.value::text !~ '^[0-7]$'
  ) THEN
    RAISE EXCEPTION 'Las respuestas del repaso no son validas';
  END IF;

  -- Bloquea las filas del cuaderno del propio alumno mientras se corrige.
  PERFORM pf.pregunta_id
    FROM public.preguntas_falladas pf
    WHERE pf.usuario_id = v_user
      AND pf.pregunta_id::text IN (
        SELECT x.key FROM pg_catalog.jsonb_each(p_respuestas) x
      )
    ORDER BY pf.pregunta_id
    FOR UPDATE OF pf;

  SELECT count(*)::integer INTO v_valid
    FROM pg_catalog.jsonb_each(p_respuestas) x
    JOIN public.preguntas_falladas pf
      ON pf.pregunta_id::text = x.key
     AND pf.usuario_id = v_user
     AND pf.dominada = false
    JOIN public.preguntas p ON p.id = pf.pregunta_id
    JOIN public.examenes e ON e.id = p.examen_id AND e.publicado = true
    JOIN private.soluciones s ON s.pregunta_id = p.id
    WHERE (x.value::text)::integer < pg_catalog.jsonb_array_length(p.opciones);

  IF v_valid <> v_count THEN
    RAISE EXCEPTION 'Algunas preguntas no estan pendientes o ya se han superado';
  END IF;

  FOR v_item IN
    SELECT p.id AS pregunta_id,
      s.respuesta_correcta, s.explicacion,
      (x.value::text)::integer AS elegida
    FROM pg_catalog.jsonb_each(p_respuestas) x
    JOIN public.preguntas p ON p.id::text = x.key
    JOIN private.soluciones s ON s.pregunta_id = p.id
    ORDER BY p.id
  LOOP
    v_correcta := v_item.elegida = v_item.respuesta_correcta;
    IF v_correcta THEN
      v_aciertos := v_aciertos + 1;
      UPDATE public.preguntas_falladas
        SET dominada = true, ultima_respuesta = v_item.elegida
        WHERE usuario_id = v_user AND pregunta_id = v_item.pregunta_id;
    ELSE
      UPDATE public.preguntas_falladas
        SET dominada = false,
          veces_fallada = veces_fallada + 1,
          ultima_respuesta = v_item.elegida,
          ultimo_fallo = now(),
          proximo_repaso = now()
        WHERE usuario_id = v_user AND pregunta_id = v_item.pregunta_id;
    END IF;
    v_correcciones := v_correcciones || pg_catalog.jsonb_build_object(
      v_item.pregunta_id::text,
      pg_catalog.jsonb_build_object(
        'respuesta_correcta', v_item.respuesta_correcta,
        'explicacion', coalesce(v_item.explicacion, ''),
        'correcta', v_correcta
      )
    );
  END LOOP;

  v_resultado := pg_catalog.jsonb_build_object(
    'aciertos', v_aciertos, 'total', v_count, 'correcciones', v_correcciones
  );
  INSERT INTO private.intentos_repaso_fallos
    (intento_id, usuario_id, respuestas, resultado, aciertos, total)
    VALUES (p_intento_id, v_user, p_respuestas, v_resultado, v_aciertos, v_count);
  RETURN v_resultado;
END;
$func$;

REVOKE ALL ON FUNCTION public.entregar_repaso_fallos(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.entregar_repaso_fallos(uuid,jsonb) TO authenticated;
