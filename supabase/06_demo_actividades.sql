-- Ejercicio de demostracion del MOTOR (no es material oficial ni simulacro).
-- Sin unidad: aparece solo en el catalogo general de actividades.
DO $demo$
DECLARE a bigint; q bigint;
BEGIN
  INSERT INTO public.actividades(slug,titulo,descripcion,destreza,publicado,orden)
  VALUES ('demostracion-motor-universal','Demostración · Cinco tipos de ejercicios',
    'Prueba técnica del motor interactivo de Easy English. No es un simulacro B2 First.',
    'use_of_english',true,1)
  ON CONFLICT(slug) DO NOTHING;
  SELECT id INTO a FROM public.actividades WHERE slug='demostracion-motor-universal';
  IF EXISTS(SELECT 1 FROM public.actividad_preguntas WHERE actividad_id=a) THEN RETURN; END IF;

  INSERT INTO public.actividad_preguntas(actividad_id,orden,tipo,enunciado,configuracion)
  VALUES(a,1,'seleccion','Choose the grammatically correct sentence.',
    pg_catalog.jsonb_build_object('opciones',pg_catalog.jsonb_build_array(
      'She have been studying all morning.','She has been studying all morning.',
      'She has studying all morning.'))) RETURNING id INTO q;
  INSERT INTO private.actividad_soluciones(pregunta_id,clave,explicacion)
  VALUES(q,pg_catalog.jsonb_build_object('indice',1),
    'Present Perfect Continuous: she + has been + verb-ing.');

  INSERT INTO public.actividad_preguntas(actividad_id,orden,tipo,enunciado)
  VALUES(a,2,'texto_corto','Write the past participle of the verb WRITE.') RETURNING id INTO q;
  INSERT INTO private.actividad_soluciones(pregunta_id,clave,explicacion)
  VALUES(q,pg_catalog.jsonb_build_object('alternativas',pg_catalog.jsonb_build_array('written')),
    'Write – wrote – written.');

  INSERT INTO public.actividad_preguntas(actividad_id,orden,tipo,enunciado,configuracion)
  VALUES(a,3,'huecos','Complete the sentence: I ____ here ____ 2020.',
    pg_catalog.jsonb_build_object('campos',
      pg_catalog.jsonb_build_array('1. Verb: live (present perfect)','2. Preposition')))
  RETURNING id INTO q;
  INSERT INTO private.actividad_soluciones(pregunta_id,clave,explicacion)
  VALUES(q,pg_catalog.jsonb_build_object('campos',pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_array('have lived', 'have been living'),
    pg_catalog.jsonb_build_array('since'))),
    'Since + point in time (2020), for + duration.');

  INSERT INTO public.actividad_preguntas(actividad_id,orden,tipo,enunciado,configuracion)
  VALUES(a,4,'transformacion',
    'Rewrite using FOR: I started learning English three years ago.',
    pg_catalog.jsonb_build_object('palabra_clave','FOR')) RETURNING id INTO q;
  INSERT INTO private.actividad_soluciones(pregunta_id,clave,explicacion)
  VALUES(q,pg_catalog.jsonb_build_object('alternativas',pg_catalog.jsonb_build_array(
    'I have been learning English for three years.',
    'I have been learning English for three years')),
    'Present Perfect Continuous links a past start with an action continuing now.');

  INSERT INTO public.actividad_preguntas(
    actividad_id,orden,tipo,enunciado,configuracion,medio_tipo,medio_url,medio_alt)
  VALUES(a,5,'redaccion',
    'Look at the image and write three or four sentences describing it. This example is not automatically graded.',
    pg_catalog.jsonb_build_object('min_palabras',25,'max_palabras',70),
    'imagen','https://jnfz92.github.io/images/b2-selfie-football.jpg',
    'Imagen de una escena deportiva para practicar una descripción.')
  RETURNING id INTO q;
END;
$demo$;