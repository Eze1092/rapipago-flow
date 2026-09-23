-- Allow manual references instead of requiring a managed Boca.
ALTER TABLE public.recaudaciones ADD COLUMN IF NOT EXISTS boca_manual text NOT NULL DEFAULT '';
ALTER TABLE public.recaudaciones ALTER COLUMN boca_id DROP NOT NULL;

-- Allow manual retirements and credits without selecting a prior Boca/Retiro.
ALTER TABLE public.acreditaciones ALTER COLUMN retiro_id DROP NOT NULL;
ALTER TABLE public.retiros ADD COLUMN IF NOT EXISTS referencia_manual text NOT NULL DEFAULT '';
