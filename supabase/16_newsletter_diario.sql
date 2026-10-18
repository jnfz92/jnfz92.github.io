-- SQL 16 · Boletín diario Easy English
-- Las altas actuales se registran sin re-enviar retrospectivamente los 145 artículos.
BEGIN;

ALTER TABLE public.articulos ADD COLUMN IF NOT EXISTS newsletter_publicado_en timestamptz;
ALTER TABLE public.articulos ALTER COLUMN newsletter_publicado_en SET DEFAULT now();
CREATE INDEX IF NOT EXISTS articulos_newsletter_publicacion_idx
ON public.articulos(newsletter_publicado_en)
WHERE newsletter_publicado_en IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.newsletter_suscriptores(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','activo','baja')),
  confirmar_hash text,
  confirmar_hasta timestamptz,
  alta_en timestamptz NOT NULL DEFAULT now(),
  confirmado_en timestamptz,
  baja_en timestamptz,
  ultimo_intento_en timestamptz,
  ultimo_envio_en timestamptz,
  ultimo_envio_dia date,
  CONSTRAINT newsletter_email_canonico CHECK (email=lower(btrim(email)) AND length(email) BETWEEN 5 AND 254)
);
CREATE INDEX IF NOT EXISTS newsletter_suscriptores_estado_idx
ON public.newsletter_suscriptores(estado,ultimo_envio_dia);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_confirmar_hash_idx
ON public.newsletter_suscriptores(confirmar_hash) WHERE confirmar_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.newsletter_envios(
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  suscriptor_id uuid NOT NULL REFERENCES public.newsletter_suscriptores(id) ON DELETE CASCADE,
  dia date NOT NULL,
  articulos text[] NOT NULL DEFAULT '{}',
  estado text NOT NULL CHECK (estado IN ('pendiente','enviado','fallido')),
  intento_en timestamptz NOT NULL DEFAULT now(),
  finalizado_en timestamptz,
  proveedor_id text,
  error text,
  UNIQUE(suscriptor_id,dia)
);
CREATE INDEX IF NOT EXISTS newsletter_envios_estado_idx
ON public.newsletter_envios(dia,estado);

ALTER TABLE public.newsletter_suscriptores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_envios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.newsletter_suscriptores,public.newsletter_envios FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.newsletter_envios_id_seq FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.newsletter_suscriptores IS 'Datos privados de suscriptores de email (solo Edge Functions con service_role). No exponer por PostgREST.';
COMMENT ON TABLE public.newsletter_envios IS 'Historial privado de entregas diarias. Sin acceso de anon ni authenticated.';
COMMENT ON COLUMN public.articulos.newsletter_publicado_en IS 'Fecha real de alta del artículo para el boletín. NULL en el catálogo histórico (no enviar material anterior).';
COMMIT;
