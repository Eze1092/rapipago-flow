import { supabase } from "@/integrations/supabase/client";

-- CRUD policies for authenticated users. Admins can maintain all records;
-- creators can correct their own unlocked records.
GRANT DELETE ON public.movimientos_atm, public.recaudaciones, public.retiros, public.acreditaciones, public.cierres, public.ajustes, public.bocas TO authenticated;

CREATE POLICY "atm baja" ON public.movimientos_atm FOR DELETE TO authenticated USING (public.es_admin() OR (created_by = auth.uid() AND estado = 'REGISTRADO'));
CREATE POLICY "recaudaciones baja" ON public.recaudaciones FOR DELETE TO authenticated USING (public.es_admin() OR (created_by = auth.uid() AND cierre_id IS NULL AND estado = 'RECAUDADO'));
CREATE POLICY "retiros baja" ON public.retiros FOR DELETE TO authenticated USING (public.es_admin());
CREATE POLICY "acreditaciones baja" ON public.acreditaciones FOR DELETE TO authenticated USING (public.es_admin());
CREATE POLICY "cierres baja" ON public.cierres FOR DELETE TO authenticated USING (public.es_admin());
CREATE POLICY "ajustes baja" ON public.ajustes FOR DELETE TO authenticated USING (public.es_admin());
CREATE POLICY "bocas baja" ON public.bocas FOR DELETE TO authenticated USING (public.es_admin());
