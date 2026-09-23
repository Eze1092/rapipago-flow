-- Permisos compatibles con el esquema real de public.recaudaciones.
-- Esta instalación no tiene created_by ni cierre_id; el administrador
-- puede modificar y eliminar cualquier recaudación.

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
      AND role = 'ADMIN'
  );
$$;

GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recaudaciones TO authenticated;

DROP POLICY IF EXISTS "recaudaciones edicion" ON public.recaudaciones;
CREATE POLICY "recaudaciones edicion"
ON public.recaudaciones
FOR UPDATE TO authenticated
USING (public.es_admin())
WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS "recaudaciones baja" ON public.recaudaciones;
CREATE POLICY "recaudaciones baja"
ON public.recaudaciones
FOR DELETE TO authenticated
USING (public.es_admin());
