-- Completar una actividad interactiva tambien cuenta para la racha.
-- Solo el trigger sobre una entrega autentica puede acreditar ese dia.
CREATE OR REPLACE FUNCTION private.creditar_actividad_interactiva_servidor()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 INSERT INTO public.actividad_diaria(usuario_id,dia,origen)
 VALUES (NEW.usuario_id,(NEW.fecha AT TIME ZONE 'Europe/Madrid')::date,'actividad')
 ON CONFLICT(usuario_id,dia) DO NOTHING;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION private.creditar_actividad_interactiva_servidor() FROM public,anon,authenticated;
CREATE TRIGGER racha_actividad_interactiva_guardada
 AFTER INSERT ON public.actividad_intentos
 FOR EACH ROW EXECUTE FUNCTION private.creditar_actividad_interactiva_servidor();
