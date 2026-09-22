CREATE TYPE public.tipo_atm AS ENUM ('CARGA', 'REINTEGRO');
CREATE TYPE public.estado_atm AS ENUM ('REGISTRADO', 'ANULADO');

CREATE TABLE public.movimientos_atm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
  hora time NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time),
  boca_id uuid REFERENCES public.bocas(id),
  tipo public.tipo_atm NOT NULL DEFAULT 'CARGA',
  importe numeric NOT NULL CHECK (importe > 0),
  observaciones text NOT NULL DEFAULT '',
  estado public.estado_atm NOT NULL DEFAULT 'REGISTRADO',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.movimientos_atm TO authenticated;
GRANT ALL ON public.movimientos_atm TO service_role;

ALTER TABLE public.movimientos_atm ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atm lectura" ON public.movimientos_atm FOR SELECT TO authenticated USING (true);
CREATE POLICY "atm alta" ON public.movimientos_atm FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "atm edicion" ON public.movimientos_atm FOR UPDATE TO authenticated
  USING (public.es_admin() OR (created_by = auth.uid() AND estado = 'REGISTRADO'))
  WITH CHECK (public.es_admin() OR created_by = auth.uid());

CREATE TRIGGER trg_atm_ts BEFORE INSERT OR UPDATE ON public.movimientos_atm FOR EACH ROW EXECUTE FUNCTION public.set_timestamps();
CREATE TRIGGER trg_atm_audit AFTER INSERT OR UPDATE ON public.movimientos_atm FOR EACH ROW EXECUTE FUNCTION public.set_auditoria();

CREATE OR REPLACE FUNCTION public.resumen_general()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_recaudado numeric := 0; v_hoy_total numeric := 0; v_semana numeric := 0; v_mes numeric := 0;
  v_retirado numeric := 0; v_acreditado numeric := 0; v_pend_acred numeric := 0;
  v_aj_pos numeric := 0; v_aj_neg numeric := 0;
  v_atm_carga numeric := 0; v_atm_rein numeric := 0; v_atm_neto numeric := 0;
BEGIN
  SELECT COALESCE(sum(importe),0) INTO v_recaudado FROM public.recaudaciones WHERE estado <> 'ANULADO';
  SELECT COALESCE(sum(importe),0) INTO v_hoy_total FROM public.recaudaciones WHERE estado <> 'ANULADO' AND fecha = v_hoy;
  SELECT COALESCE(sum(importe),0) INTO v_semana FROM public.recaudaciones WHERE estado <> 'ANULADO' AND fecha >= date_trunc('week', v_hoy)::date;
  SELECT COALESCE(sum(importe),0) INTO v_mes FROM public.recaudaciones WHERE estado <> 'ANULADO' AND fecha >= date_trunc('month', v_hoy)::date;
  SELECT COALESCE(sum(importe_retirado),0) INTO v_retirado FROM public.retiros WHERE estado <> 'ANULADO';
  SELECT COALESCE(sum(importe),0) INTO v_acreditado FROM public.acreditaciones WHERE estado <> 'ANULADO';
  SELECT COALESCE(sum(r.importe_retirado),0) INTO v_pend_acred FROM public.retiros r WHERE r.estado = 'PENDIENTE_ACREDITACION';
  SELECT COALESCE(sum(importe),0) INTO v_aj_pos FROM public.ajustes WHERE tipo = 'POSITIVO';
  SELECT COALESCE(sum(importe),0) INTO v_aj_neg FROM public.ajustes WHERE tipo = 'NEGATIVO';
  SELECT COALESCE(sum(importe),0) INTO v_atm_carga FROM public.movimientos_atm WHERE estado <> 'ANULADO' AND tipo = 'CARGA';
  SELECT COALESCE(sum(importe),0) INTO v_atm_rein FROM public.movimientos_atm WHERE estado <> 'ANULADO' AND tipo = 'REINTEGRO';
  v_atm_neto := v_atm_carga - v_atm_rein;

  RETURN jsonb_build_object(
    'recaudado_total', v_recaudado,
    'recaudado_hoy', v_hoy_total,
    'recaudado_semana', v_semana,
    'recaudado_mes', v_mes,
    'retirado_total', v_retirado,
    'acreditado_total', v_acreditado,
    'atm_cargado', v_atm_carga,
    'atm_reintegrado', v_atm_rein,
    'atm_neto', v_atm_neto,
    'pendiente_retiro', v_recaudado + v_aj_pos - v_aj_neg - v_atm_neto - v_retirado,
    'pendiente_acreditacion', v_pend_acred,
    'diferencias', v_acreditado - (v_retirado - v_pend_acred),
    'ajustes_positivos', v_aj_pos,
    'ajustes_negativos', v_aj_neg,
    'saldo', v_recaudado + v_aj_pos - v_aj_neg - v_atm_neto - v_retirado
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.historial(_desde date DEFAULT NULL::date, _hasta date DEFAULT NULL::date)
 RETURNS TABLE(id uuid, fecha date, hora time without time zone, tipo text, boca text, cajero text, importe numeric, descripcion text, estado text, usuario uuid, creado timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.id, r.fecha, r.hora, 'RECAUDACION', b.codigo, COALESCE(NULLIF(r.cajero_nombre,''),'-'), r.importe, r.observaciones, r.estado::text, r.created_by, r.created_at
  FROM public.recaudaciones r JOIN public.bocas b ON b.id = r.boca_id
  WHERE (_desde IS NULL OR r.fecha >= _desde) AND (_hasta IS NULL OR r.fecha <= _hasta)
  UNION ALL
  SELECT t.id, t.fecha, t.hora, 'RETIRO',
    COALESCE((SELECT string_agg(b2.codigo, ' + ' ORDER BY b2.codigo) FROM public.retiro_bocas rb JOIN public.bocas b2 ON b2.id = rb.boca_id WHERE rb.retiro_id = t.id), 'Todas'),
    'Camión', t.importe_retirado, NULLIF(t.remito,''), t.estado::text, t.created_by, t.created_at
  FROM public.retiros t
  WHERE (_desde IS NULL OR t.fecha >= _desde) AND (_hasta IS NULL OR t.fecha <= _hasta)
  UNION ALL
  SELECT a.id, a.fecha_acreditacion, '00:00'::time, 'ACREDITACION', '-', 'Empresa', a.importe, NULLIF(a.comprobante,''), a.estado::text, a.created_by, a.created_at
  FROM public.acreditaciones a
  WHERE (_desde IS NULL OR a.fecha_acreditacion >= _desde) AND (_hasta IS NULL OR a.fecha_acreditacion <= _hasta)
  UNION ALL
  SELECT m.id, m.fecha, m.hora,
    CASE WHEN m.tipo = 'CARGA' THEN 'ATM_CARGA' ELSE 'ATM_REINTEGRO' END,
    COALESCE((SELECT codigo FROM public.bocas WHERE id = m.boca_id), '-'), 'Cajero automático',
    CASE WHEN m.tipo = 'CARGA' THEN -m.importe ELSE m.importe END,
    NULLIF(m.observaciones,''), m.estado::text, m.created_by, m.created_at
  FROM public.movimientos_atm m
  WHERE (_desde IS NULL OR m.fecha >= _desde) AND (_hasta IS NULL OR m.fecha <= _hasta)
  UNION ALL
  SELECT j.id, j.fecha, '00:00'::time, 'AJUSTE', COALESCE((SELECT codigo FROM public.bocas WHERE id = j.boca_id), '-'), '-',
    CASE WHEN j.tipo = 'NEGATIVO' THEN -j.importe ELSE j.importe END, j.motivo, j.tipo::text, j.created_by, j.created_at
  FROM public.ajustes j
  WHERE (_desde IS NULL OR j.fecha >= _desde) AND (_hasta IS NULL OR j.fecha <= _hasta)
  UNION ALL
  SELECT c.id, c.fecha, '00:00'::time, 'CIERRE', '-', '-', c.total, c.observaciones, c.estado::text, c.created_by, c.created_at
  FROM public.cierres c
  WHERE (_desde IS NULL OR c.fecha >= _desde) AND (_hasta IS NULL OR c.fecha <= _hasta)
  ORDER BY 2 DESC, 3 DESC;
$function$;