-- CRUD policies for authenticated users. Admins can maintain all records;
-- creators can correct their own unlocked records.

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'ADMIN'::public.app_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimientos_atm, public.recaudaciones, public.retiros, public.acreditaciones, public.cierres, public.ajustes, public.bocas TO authenticated;

CREATE POLICY "atm baja" ON public.movimientos_atm FOR DELETE TO authenticated USING (public.es_admin() OR (created_by = auth.uid() AND estado = 'REGISTRADO'));
CREATE POLICY "recaudaciones baja" ON public.recaudaciones FOR DELETE TO authenticated USING (public.es_admin() OR (created_by = auth.uid() AND cierre_id IS NULL AND estado = 'RECAUDADO'));
CREATE POLICY "retiros baja" ON public.retiros FOR DELETE TO authenticated USING (public.es_admin());
CREATE POLICY "acreditaciones baja" ON public.acreditaciones FOR DELETE TO authenticated USING (public.es_admin());
CREATE POLICY "cierres baja" ON public.cierres FOR DELETE TO authenticated USING (public.es_admin());
CREATE POLICY "ajustes baja" ON public.ajustes FOR DELETE TO authenticated USING (public.es_admin());
CREATE POLICY "bocas baja" ON public.bocas FOR DELETE TO authenticated USING (public.es_admin());

DROP POLICY IF EXISTS "recaudaciones edicion" ON public.recaudaciones;
CREATE POLICY "recaudaciones edicion" ON public.recaudaciones FOR UPDATE TO authenticated
  USING (
    public.es_admin()
    OR (
      cierre_id IS NULL
      AND estado <> 'ANULADO'
      AND (created_by = auth.uid() OR cajero_id = auth.uid())
    )
  )
  WITH CHECK (
    public.es_admin()
    OR (
      cierre_id IS NULL
      AND estado <> 'ANULADO'
      AND (created_by = auth.uid() OR cajero_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "recaudaciones baja" ON public.recaudaciones;
CREATE POLICY "recaudaciones baja" ON public.recaudaciones FOR DELETE TO authenticated
  USING (
    public.es_admin()
    OR (
      cierre_id IS NULL
      AND estado <> 'ANULADO'
      AND (created_by = auth.uid() OR cajero_id = auth.uid())
    )
  );
