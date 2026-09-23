-- Habilita editar y eliminar recaudaciones visibles por el cajero.
-- También contempla registros antiguos que quedaron con created_by NULL,
-- pero conservan cajero_id igual al usuario que los cargó.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recaudaciones TO authenticated;

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
