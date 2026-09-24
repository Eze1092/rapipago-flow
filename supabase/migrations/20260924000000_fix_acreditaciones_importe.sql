-- Corrige instalaciones donde acreditaciones quedó creada sin importe
-- y fuerza a PostgREST a actualizar su caché de esquema.
ALTER TABLE public.acreditaciones
  ADD COLUMN IF NOT EXISTS importe numeric(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public.acreditaciones
  ALTER COLUMN importe SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.acreditaciones'::regclass
      AND conname = 'acreditaciones_importe_check'
  ) THEN
    ALTER TABLE public.acreditaciones
      ADD CONSTRAINT acreditaciones_importe_check CHECK (importe >= 0);
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE ON public.acreditaciones TO authenticated;
GRANT ALL ON public.acreditaciones TO service_role;

NOTIFY pgrst, 'reload schema';
