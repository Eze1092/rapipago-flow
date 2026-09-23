-- Permite registrar acreditaciones manuales sin asociarlas a un retiro.
-- Los vínculos históricos existentes permanecen intactos.
ALTER TABLE public.acreditaciones
  ALTER COLUMN retiro_id DROP NOT NULL;
