import { supabase } from "@/integrations/supabase/client";

export type Boca = {
  id: string;
  codigo: string;
  nombre: string;
  activa: boolean;
};

export type Resumen = {
  recaudado_total: number;
  recaudado_hoy: number;
  recaudado_semana: number;
  recaudado_mes: number;
  retirado_total: number;
  acreditado_total: number;
  pendiente_retiro: number;
  pendiente_acreditacion: number;
  diferencias: number;
  ajustes_positivos: number;
  ajustes_negativos: number;
  saldo: number;
};

export type Recaudacion = {
  id: string;
  fecha: string;
  hora: string;
  boca_id: string;
  cajero_id: string | null;
  cajero_nombre: string;
  importe: number;
  observaciones: string;
  estado: "RECAUDADO" | "RETIRADO" | "ANULADO";
  cierre_id: string | null;
  created_by: string | null;
  created_at: string;
  bocas?: { codigo: string } | null;
};

export type Retiro = {
  id: string;
  fecha: string;
  hora: string;
  importe_declarado: number;
  importe_retirado: number;
  remito: string;
  observaciones: string;
  estado: "PENDIENTE_ACREDITACION" | "ACREDITADO" | "ANULADO";
  created_at: string;
  created_by: string | null;
};

export type Acreditacion = {
  id: string;
  fecha_acreditacion: string;
  retiro_id: string;
  importe: number;
  comprobante: string;
  observaciones: string;
  estado: "ACREDITADO" | "ANULADO";
  created_at: string;
};

export type MovimientoHistorial = {
  id: string;
  fecha: string;
  hora: string;
  tipo: string;
  boca: string | null;
  cajero: string | null;
  importe: number;
  descripcion: string | null;
  estado: string;
  usuario: string | null;
  creado: string;
};

function lanzar(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function obtenerResumen(): Promise<Resumen> {
  const { data, error } = await supabase.rpc("resumen_general");
  lanzar(error);
  return data as unknown as Resumen;
}

export async function obtenerBocas(): Promise<Boca[]> {
  const { data, error } = await supabase.from("bocas").select("*").order("codigo");
  lanzar(error);
  return (data ?? []) as Boca[];
}

export async function obtenerSerieDiaria(dias = 14) {
  const { data, error } = await supabase.rpc("serie_diaria", { _dias: dias });
  lanzar(error);
  return (data ?? []) as { fecha: string; total: number }[];
}

export async function obtenerResumenPorBoca(desde?: string, hasta?: string) {
  const { data, error } = await supabase.rpc("resumen_por_boca", {
    _desde: desde ?? undefined,
    _hasta: hasta ?? undefined,
  });
  lanzar(error);
  return (data ?? []) as { boca_id: string; codigo: string; total: number; operaciones: number }[];
}

export async function obtenerResumenPorCajero(desde?: string, hasta?: string) {
  const { data, error } = await supabase.rpc("resumen_por_cajero", {
    _desde: desde ?? undefined,
    _hasta: hasta ?? undefined,
  });
  lanzar(error);
  return (data ?? []) as { cajero: string; total: number; operaciones: number }[];
}

export type FiltroRecaudaciones = {
  desde?: string;
  hasta?: string;
  bocaId?: string;
  cajero?: string;
};

export async function obtenerRecaudaciones(filtro: FiltroRecaudaciones = {}) {
  let q = supabase
    .from("recaudaciones")
    .select("*, bocas(codigo)")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(500);

  if (filtro.desde) q = q.gte("fecha", filtro.desde);
  if (filtro.hasta) q = q.lte("fecha", filtro.hasta);
  if (filtro.bocaId) q = q.eq("boca_id", filtro.bocaId);
  if (filtro.cajero) q = q.ilike("cajero_nombre", `%${filtro.cajero}%`);

  const { data, error } = await q;
  lanzar(error);
  return (data ?? []) as unknown as Recaudacion[];
}

export async function obtenerRetiros() {
  const { data, error } = await supabase
    .from("retiros")
    .select("*, retiro_bocas(boca_id, bocas(codigo)), acreditaciones(id, importe, fecha_acreditacion, estado)")
    .order("fecha", { ascending: false })
    .limit(300);
  lanzar(error);
  return (data ?? []) as unknown as (Retiro & {
    retiro_bocas: { boca_id: string; bocas: { codigo: string } | null }[];
    acreditaciones: { id: string; importe: number; fecha_acreditacion: string; estado: string }[];
  })[];
}

export async function obtenerAcreditaciones() {
  const { data, error } = await supabase
    .from("acreditaciones")
    .select("*, retiros(fecha, importe_retirado, remito)")
    .order("fecha_acreditacion", { ascending: false })
    .limit(300);
  lanzar(error);
  return (data ?? []) as unknown as (Acreditacion & {
    retiros: { fecha: string; importe_retirado: number; remito: string } | null;
  })[];
}

export async function obtenerCierres() {
  const { data, error } = await supabase
    .from("cierres")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(200);
  lanzar(error);
  return (data ?? []) as unknown as {
    id: string;
    fecha: string;
    total: number;
    cantidad_operaciones: number;
    detalle: {
      por_boca?: { codigo: string; total: number; operaciones: number }[];
      por_cajero?: { cajero: string; total: number; operaciones: number }[];
      ajustes?: number;
    };
    observaciones: string;
    estado: string;
    created_at: string;
  }[];
}

export async function obtenerAjustes() {
  const { data, error } = await supabase
    .from("ajustes")
    .select("*, bocas(codigo)")
    .order("fecha", { ascending: false })
    .limit(200);
  lanzar(error);
  return (data ?? []) as unknown as {
    id: string;
    fecha: string;
    tipo: "POSITIVO" | "NEGATIVO";
    importe: number;
    motivo: string;
    created_at: string;
    bocas: { codigo: string } | null;
  }[];
}

export async function obtenerHistorial(desde?: string, hasta?: string) {
  const { data, error } = await supabase.rpc("historial", {
    _desde: desde ?? undefined,
    _hasta: hasta ?? undefined,
  });
  lanzar(error);
  return (data ?? []) as unknown as MovimientoHistorial[];
}

export async function obtenerUsuarios() {
  const [{ data: perfiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
    supabase.from("profiles").select("*").order("nombre"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  lanzar(e1);
  lanzar(e2);
  const mapa = new Map((roles ?? []).map((r) => [r.user_id, r.role as string]));
  return (perfiles ?? []).map((p) => ({
    ...(p as { id: string; nombre: string; email: string; activo: boolean; created_at: string }),
    rol: mapa.get((p as { id: string }).id) ?? "CAJERO",
  }));
}

export async function obtenerAuditoria() {
  const { data, error } = await supabase
    .from("auditoria")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  lanzar(error);
  return (data ?? []) as unknown as {
    id: string;
    tabla: string;
    registro_id: string | null;
    accion: string;
    usuario_id: string | null;
    valores_anteriores: Record<string, unknown> | null;
    valores_nuevos: Record<string, unknown> | null;
    created_at: string;
  }[];
}

export const etiquetaEstado: Record<string, string> = {
  RECAUDADO: "Recaudado",
  RETIRADO: "Retirado",
  ANULADO: "Anulado",
  PENDIENTE_ACREDITACION: "Pend. acreditación",
  ACREDITADO: "Acreditado",
  CERRADO: "Cerrado",
  POSITIVO: "Ajuste +",
  NEGATIVO: "Ajuste -",
};

export const claseEstado: Record<string, string> = {
  RECAUDADO: "border-royal/40 bg-royal/10 text-royal",
  RETIRADO: "border-gold/50 bg-gold/15 text-gold",
  ANULADO: "border-rose/40 bg-rose/10 text-rose",
  PENDIENTE_ACREDITACION: "border-royal/40 bg-royal/10 text-royal",
  ACREDITADO: "border-teal/40 bg-teal/10 text-teal",
  CERRADO: "border-teal/40 bg-teal/10 text-teal",
  POSITIVO: "border-teal/40 bg-teal/10 text-teal",
  NEGATIVO: "border-rose/40 bg-rose/10 text-rose",
};
