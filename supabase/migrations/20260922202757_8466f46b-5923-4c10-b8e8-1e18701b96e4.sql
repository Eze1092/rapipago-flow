
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('ADMIN','CAJERO');
CREATE TYPE public.estado_recaudacion AS ENUM ('RECAUDADO','RETIRADO','ANULADO');
CREATE TYPE public.estado_retiro AS ENUM ('PENDIENTE_ACREDITACION','ACREDITADO','ANULADO');
CREATE TYPE public.estado_acreditacion AS ENUM ('ACREDITADO','ANULADO');
CREATE TYPE public.estado_cierre AS ENUM ('CERRADO','ANULADO');
CREATE TYPE public.tipo_ajuste AS ENUM ('POSITIVO','NEGATIVO');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nombre text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'ADMIN');
$$;

-- ============ BOCAS ============
CREATE TABLE public.bocas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL DEFAULT '',
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bocas TO authenticated;
GRANT ALL ON public.bocas TO service_role;
ALTER TABLE public.bocas ENABLE ROW LEVEL SECURITY;

-- ============ RECAUDACIONES ============
CREATE TABLE public.recaudaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  hora time NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time,
  boca_id uuid NOT NULL REFERENCES public.bocas(id),
  cajero_id uuid REFERENCES public.profiles(id),
  cajero_nombre text NOT NULL DEFAULT '',
  importe numeric(14,2) NOT NULL CHECK (importe > 0),
  observaciones text NOT NULL DEFAULT '',
  estado public.estado_recaudacion NOT NULL DEFAULT 'RECAUDADO',
  retiro_id uuid,
  cierre_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.recaudaciones TO authenticated;
GRANT ALL ON public.recaudaciones TO service_role;
ALTER TABLE public.recaudaciones ENABLE ROW LEVEL SECURITY;

-- ============ RETIROS ============
CREATE TABLE public.retiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  hora time NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::time,
  importe_declarado numeric(14,2) NOT NULL CHECK (importe_declarado >= 0),
  importe_retirado numeric(14,2) NOT NULL CHECK (importe_retirado >= 0),
  remito text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  estado public.estado_retiro NOT NULL DEFAULT 'PENDIENTE_ACREDITACION',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.retiros TO authenticated;
GRANT ALL ON public.retiros TO service_role;
ALTER TABLE public.retiros ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.retiro_bocas (
  retiro_id uuid NOT NULL REFERENCES public.retiros(id) ON DELETE CASCADE,
  boca_id uuid NOT NULL REFERENCES public.bocas(id),
  PRIMARY KEY (retiro_id, boca_id)
);
GRANT SELECT, INSERT, DELETE ON public.retiro_bocas TO authenticated;
GRANT ALL ON public.retiro_bocas TO service_role;
ALTER TABLE public.retiro_bocas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recaudaciones
  ADD CONSTRAINT recaudaciones_retiro_fk FOREIGN KEY (retiro_id) REFERENCES public.retiros(id);

-- ============ ACREDITACIONES ============
CREATE TABLE public.acreditaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_acreditacion date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  retiro_id uuid NOT NULL REFERENCES public.retiros(id),
  importe numeric(14,2) NOT NULL CHECK (importe >= 0),
  comprobante text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  estado public.estado_acreditacion NOT NULL DEFAULT 'ACREDITADO',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.acreditaciones TO authenticated;
GRANT ALL ON public.acreditaciones TO service_role;
ALTER TABLE public.acreditaciones ENABLE ROW LEVEL SECURITY;

-- ============ CIERRES ============
CREATE TABLE public.cierres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  total numeric(14,2) NOT NULL DEFAULT 0,
  cantidad_operaciones integer NOT NULL DEFAULT 0,
  detalle jsonb NOT NULL DEFAULT '{}'::jsonb,
  observaciones text NOT NULL DEFAULT '',
  estado public.estado_cierre NOT NULL DEFAULT 'CERRADO',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fecha)
);
GRANT SELECT, INSERT, UPDATE ON public.cierres TO authenticated;
GRANT ALL ON public.cierres TO service_role;
ALTER TABLE public.cierres ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recaudaciones
  ADD CONSTRAINT recaudaciones_cierre_fk FOREIGN KEY (cierre_id) REFERENCES public.cierres(id);

-- ============ AJUSTES ============
CREATE TABLE public.ajustes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  boca_id uuid REFERENCES public.bocas(id),
  tipo public.tipo_ajuste NOT NULL,
  importe numeric(14,2) NOT NULL CHECK (importe > 0),
  motivo text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ajustes TO authenticated;
GRANT ALL ON public.ajustes TO service_role;
ALTER TABLE public.ajustes ENABLE ROW LEVEL SECURITY;

-- ============ AUDITORIA ============
CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla text NOT NULL,
  registro_id uuid,
  accion text NOT NULL,
  usuario_id uuid,
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_auditoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.auditoria (tabla, registro_id, accion, usuario_id, valores_anteriores, valores_nuevos)
  VALUES (
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_timestamps()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  ELSE
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recaudaciones_ts BEFORE INSERT OR UPDATE ON public.recaudaciones FOR EACH ROW EXECUTE FUNCTION public.set_timestamps();
CREATE TRIGGER trg_retiros_ts BEFORE INSERT OR UPDATE ON public.retiros FOR EACH ROW EXECUTE FUNCTION public.set_timestamps();
CREATE TRIGGER trg_acreditaciones_ts BEFORE INSERT OR UPDATE ON public.acreditaciones FOR EACH ROW EXECUTE FUNCTION public.set_timestamps();

CREATE TRIGGER trg_recaudaciones_audit AFTER INSERT OR UPDATE ON public.recaudaciones FOR EACH ROW EXECUTE FUNCTION public.set_auditoria();
CREATE TRIGGER trg_retiros_audit AFTER INSERT OR UPDATE ON public.retiros FOR EACH ROW EXECUTE FUNCTION public.set_auditoria();
CREATE TRIGGER trg_acreditaciones_audit AFTER INSERT OR UPDATE ON public.acreditaciones FOR EACH ROW EXECUTE FUNCTION public.set_auditoria();
CREATE TRIGGER trg_cierres_audit AFTER INSERT OR UPDATE ON public.cierres FOR EACH ROW EXECUTE FUNCTION public.set_auditoria();
CREATE TRIGGER trg_ajustes_audit AFTER INSERT ON public.ajustes FOR EACH ROW EXECUTE FUNCTION public.set_auditoria();
CREATE TRIGGER trg_bocas_audit AFTER INSERT OR UPDATE ON public.bocas FOR EACH ROW EXECUTE FUNCTION public.set_auditoria();

-- nuevo usuario -> perfil + rol (primer usuario ADMIN)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO v_count FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN v_count = 0 THEN 'ADMIN'::public.app_role ELSE 'CAJERO'::public.app_role end)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ POLICIES ============
CREATE POLICY "perfiles visibles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfil propio editable" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.es_admin()) WITH CHECK (id = auth.uid() OR public.es_admin());

CREATE POLICY "roles visibles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.es_admin());

CREATE POLICY "bocas visibles" ON public.bocas FOR SELECT TO authenticated USING (true);
CREATE POLICY "bocas admin insert" ON public.bocas FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY "bocas admin update" ON public.bocas FOR UPDATE TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY "recaudaciones lectura" ON public.recaudaciones FOR SELECT TO authenticated
  USING (public.es_admin() OR cajero_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY "recaudaciones alta" ON public.recaudaciones FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "recaudaciones edicion" ON public.recaudaciones FOR UPDATE TO authenticated
  USING (public.es_admin() OR (created_by = auth.uid() AND cierre_id IS NULL AND estado = 'RECAUDADO'))
  WITH CHECK (public.es_admin() OR (created_by = auth.uid() AND cierre_id IS NULL));

CREATE POLICY "retiros lectura" ON public.retiros FOR SELECT TO authenticated USING (true);
CREATE POLICY "retiros admin alta" ON public.retiros FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY "retiros admin edicion" ON public.retiros FOR UPDATE TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY "retiro_bocas lectura" ON public.retiro_bocas FOR SELECT TO authenticated USING (true);
CREATE POLICY "retiro_bocas admin alta" ON public.retiro_bocas FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY "retiro_bocas admin baja" ON public.retiro_bocas FOR DELETE TO authenticated USING (public.es_admin());

CREATE POLICY "acreditaciones lectura" ON public.acreditaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "acreditaciones admin alta" ON public.acreditaciones FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY "acreditaciones admin edicion" ON public.acreditaciones FOR UPDATE TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY "cierres lectura" ON public.cierres FOR SELECT TO authenticated USING (true);
CREATE POLICY "cierres admin alta" ON public.cierres FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY "cierres admin edicion" ON public.cierres FOR UPDATE TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY "ajustes lectura" ON public.ajustes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ajustes admin alta" ON public.ajustes FOR INSERT TO authenticated WITH CHECK (public.es_admin());

CREATE POLICY "auditoria admin" ON public.auditoria FOR SELECT TO authenticated USING (public.es_admin());

-- ============ CALCULOS EN BASE ============
CREATE OR REPLACE FUNCTION public.resumen_general()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_recaudado numeric := 0; v_hoy_total numeric := 0; v_semana numeric := 0; v_mes numeric := 0;
  v_retirado numeric := 0; v_acreditado numeric := 0; v_pend_acred numeric := 0;
  v_aj_pos numeric := 0; v_aj_neg numeric := 0;
BEGIN
  SELECT COALESCE(sum(importe),0) INTO v_recaudado FROM public.recaudaciones WHERE estado <> 'ANULADO';
  SELECT COALESCE(sum(importe),0) INTO v_hoy_total FROM public.recaudaciones WHERE estado <> 'ANULADO' AND fecha = v_hoy;
  SELECT COALESCE(sum(importe),0) INTO v_semana FROM public.recaudaciones WHERE estado <> 'ANULADO' AND fecha >= date_trunc('week', v_hoy)::date;
  SELECT COALESCE(sum(importe),0) INTO v_mes FROM public.recaudaciones WHERE estado <> 'ANULADO' AND fecha >= date_trunc('month', v_hoy)::date;
  SELECT COALESCE(sum(importe_retirado),0) INTO v_retirado FROM public.retiros WHERE estado <> 'ANULADO';
  SELECT COALESCE(sum(importe),0) INTO v_acreditado FROM public.acreditaciones WHERE estado <> 'ANULADO';
  SELECT COALESCE(sum(r.importe_retirado),0) INTO v_pend_acred FROM public.retiros r
    WHERE r.estado = 'PENDIENTE_ACREDITACION';
  SELECT COALESCE(sum(importe),0) INTO v_aj_pos FROM public.ajustes WHERE tipo = 'POSITIVO';
  SELECT COALESCE(sum(importe),0) INTO v_aj_neg FROM public.ajustes WHERE tipo = 'NEGATIVO';

  RETURN jsonb_build_object(
    'recaudado_total', v_recaudado,
    'recaudado_hoy', v_hoy_total,
    'recaudado_semana', v_semana,
    'recaudado_mes', v_mes,
    'retirado_total', v_retirado,
    'acreditado_total', v_acreditado,
    'pendiente_retiro', v_recaudado + v_aj_pos - v_aj_neg - v_retirado,
    'pendiente_acreditacion', v_pend_acred,
    'diferencias', v_acreditado - (v_retirado - v_pend_acred),
    'ajustes_positivos', v_aj_pos,
    'ajustes_negativos', v_aj_neg,
    'saldo', v_recaudado + v_aj_pos - v_aj_neg - v_retirado
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.resumen_general() TO authenticated;

CREATE OR REPLACE FUNCTION public.resumen_por_boca(_desde date DEFAULT NULL, _hasta date DEFAULT NULL)
RETURNS TABLE (boca_id uuid, codigo text, total numeric, operaciones bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.codigo, COALESCE(sum(r.importe),0), count(r.id)
  FROM public.bocas b
  LEFT JOIN public.recaudaciones r ON r.boca_id = b.id AND r.estado <> 'ANULADO'
    AND (_desde IS NULL OR r.fecha >= _desde) AND (_hasta IS NULL OR r.fecha <= _hasta)
  GROUP BY b.id, b.codigo ORDER BY b.codigo;
$$;
GRANT EXECUTE ON FUNCTION public.resumen_por_boca(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.resumen_por_cajero(_desde date DEFAULT NULL, _hasta date DEFAULT NULL)
RETURNS TABLE (cajero text, total numeric, operaciones bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(r.cajero_nombre,''), 'Sin asignar'), COALESCE(sum(r.importe),0), count(r.id)
  FROM public.recaudaciones r
  WHERE r.estado <> 'ANULADO'
    AND (_desde IS NULL OR r.fecha >= _desde) AND (_hasta IS NULL OR r.fecha <= _hasta)
  GROUP BY 1 ORDER BY 2 DESC;
$$;
GRANT EXECUTE ON FUNCTION public.resumen_por_cajero(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.serie_diaria(_dias integer DEFAULT 14)
RETURNS TABLE (fecha date, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d::date, COALESCE(sum(r.importe),0)
  FROM generate_series(
    (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - (_dias - 1),
    (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
    interval '1 day') d
  LEFT JOIN public.recaudaciones r ON r.fecha = d::date AND r.estado <> 'ANULADO'
  GROUP BY d ORDER BY d;
$$;
GRANT EXECUTE ON FUNCTION public.serie_diaria(integer) TO authenticated;

-- cerrar jornada (solo admin)
CREATE OR REPLACE FUNCTION public.cerrar_jornada(_fecha date, _observaciones text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid; v_total numeric; v_cant integer; v_detalle jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'ADMIN') THEN
    RAISE EXCEPTION 'Solo un administrador puede cerrar la jornada';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cierres WHERE fecha = _fecha AND estado = 'CERRADO') THEN
    RAISE EXCEPTION 'La jornada % ya se encuentra cerrada', _fecha;
  END IF;

  SELECT COALESCE(sum(importe),0), count(*) INTO v_total, v_cant
  FROM public.recaudaciones WHERE fecha = _fecha AND estado <> 'ANULADO';

  SELECT jsonb_build_object(
    'por_boca', COALESCE((SELECT jsonb_agg(jsonb_build_object('codigo', b.codigo, 'total', t.total, 'operaciones', t.ops))
      FROM (SELECT boca_id, sum(importe) total, count(*) ops FROM public.recaudaciones
            WHERE fecha = _fecha AND estado <> 'ANULADO' GROUP BY boca_id) t
      JOIN public.bocas b ON b.id = t.boca_id), '[]'::jsonb),
    'por_cajero', COALESCE((SELECT jsonb_agg(jsonb_build_object('cajero', c.cajero, 'total', c.total, 'operaciones', c.ops))
      FROM (SELECT COALESCE(NULLIF(cajero_nombre,''),'Sin asignar') cajero, sum(importe) total, count(*) ops
            FROM public.recaudaciones WHERE fecha = _fecha AND estado <> 'ANULADO'
            GROUP BY 1) c), '[]'::jsonb),
    'ajustes', COALESCE((SELECT sum(CASE WHEN tipo='POSITIVO' THEN importe ELSE -importe END) FROM public.ajustes WHERE fecha = _fecha), 0)
  ) INTO v_detalle;

  INSERT INTO public.cierres (fecha, total, cantidad_operaciones, detalle, observaciones, created_by)
  VALUES (_fecha, v_total, v_cant, v_detalle, COALESCE(_observaciones,''), auth.uid())
  RETURNING id INTO v_id;

  UPDATE public.recaudaciones SET cierre_id = v_id WHERE fecha = _fecha AND estado <> 'ANULADO' AND cierre_id IS NULL;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cerrar_jornada(date, text) TO authenticated;

-- historial unificado
CREATE OR REPLACE FUNCTION public.historial(_desde date DEFAULT NULL, _hasta date DEFAULT NULL)
RETURNS TABLE (id uuid, fecha date, hora time, tipo text, boca text, cajero text, importe numeric, descripcion text, estado text, usuario uuid, creado timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  SELECT j.id, j.fecha, '00:00'::time, 'AJUSTE', COALESCE((SELECT codigo FROM public.bocas WHERE id = j.boca_id), '-'), '-',
    CASE WHEN j.tipo = 'NEGATIVO' THEN -j.importe ELSE j.importe END, j.motivo, j.tipo::text, j.created_by, j.created_at
  FROM public.ajustes j
  WHERE (_desde IS NULL OR j.fecha >= _desde) AND (_hasta IS NULL OR j.fecha <= _hasta)
  UNION ALL
  SELECT c.id, c.fecha, '00:00'::time, 'CIERRE', '-', '-', c.total, c.observaciones, c.estado::text, c.created_by, c.created_at
  FROM public.cierres c
  WHERE (_desde IS NULL OR c.fecha >= _desde) AND (_hasta IS NULL OR c.fecha <= _hasta)
  ORDER BY 2 DESC, 3 DESC;
$$;
GRANT EXECUTE ON FUNCTION public.historial(date, date) TO authenticated;

-- ============ DATOS INICIALES ============
INSERT INTO public.bocas (codigo, nombre) VALUES ('41159','Boca 41159'), ('42278','Boca 42278');

INSERT INTO public.recaudaciones (fecha, hora, boca_id, cajero_nombre, importe, observaciones, estado)
VALUES
 ('2026-09-21','18:00', (SELECT id FROM public.bocas WHERE codigo='41159'), 'Juan', 350000.00, 'Carga inicial de prueba', 'RETIRADO'),
 ('2026-09-21','18:30', (SELECT id FROM public.bocas WHERE codigo='42278'), 'María', 258000.00, 'Carga inicial de prueba', 'RETIRADO'),
 ('2026-09-22','18:00', (SELECT id FROM public.bocas WHERE codigo='41159'), 'Juan', 1900000.00, 'Carga inicial de prueba', 'RETIRADO'),
 ('2026-09-22','18:30', (SELECT id FROM public.bocas WHERE codigo='42278'), 'María', 1500000.00, 'Carga inicial de prueba', 'RETIRADO');

INSERT INTO public.retiros (id, fecha, hora, importe_declarado, importe_retirado, remito, observaciones, estado)
VALUES ('11111111-1111-4111-8111-111111111111','2026-09-22','20:00', 4008000.00, 4008000.00, 'R-0001', 'Retiro del camión recaudador', 'ACREDITADO');

INSERT INTO public.retiro_bocas (retiro_id, boca_id)
SELECT '11111111-1111-4111-8111-111111111111', id FROM public.bocas;

UPDATE public.recaudaciones SET retiro_id = '11111111-1111-4111-8111-111111111111' WHERE retiro_id IS NULL;

INSERT INTO public.acreditaciones (fecha_acreditacion, retiro_id, importe, comprobante, observaciones)
VALUES ('2026-09-23','11111111-1111-4111-8111-111111111111', 4005500.00, 'OP-88421', 'Acreditación de la empresa');
