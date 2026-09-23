import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { etiquetaEstado, obtenerBocas, obtenerRecaudaciones } from "@/lib/data";
import { formatARS, formatFecha, formatHora, hoyISO, parseImporte } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/recaudaciones")({ component: Recaudaciones });
const OPCIONES_BOCA = ["PUESTO 41159", "PUESTO 42278"] as const;

type Edicion = { id: string; fecha: string; boca: string; cajero: string; importe: string; observaciones: string };
function Recaudaciones() {
  const { perfil, user, esAdmin } = useAuth(); const qc = useQueryClient();
  const bocas = useQuery({ queryKey: ["bocas"], queryFn: obtenerBocas });
  const [filtro, setFiltro] = useState({ desde: "", hasta: "", cajero: "" });
  const lista = useQuery({ queryKey: ["recaudaciones", filtro], queryFn: () => obtenerRecaudaciones({ desde: filtro.desde || undefined, hasta: filtro.hasta || undefined, cajero: filtro.cajero || undefined }) });
  const [form, setForm] = useState({ fecha: hoyISO(), boca: OPCIONES_BOCA[0], cajero: "", importe: "", observaciones: "" });
  const [editando, setEditando] = useState<Edicion | null>(null);
  const guardar = useMutation({
    mutationFn: async () => {
      const v = editando ?? form; const importe = parseImporte(v.importe);
      if (!Number.isFinite(importe) || importe <= 0) throw new Error("El importe debe ser mayor a cero");
      const codigo = v.boca.replace("PUESTO ", ""); const bocaId = bocas.data?.find((b) => b.codigo === codigo)?.id ?? null;
      const payload = { fecha: v.fecha, boca_id: bocaId, boca_manual: v.boca.trim(), cajero_id: user?.id ?? null, cajero_nombre: v.cajero.trim() || perfil?.nombre || "Sin asignar", importe, observaciones: v.observaciones.trim() };
      const result = editando ? await supabase.from("recaudaciones").update(payload as never).eq("id", editando.id) : await supabase.from("recaudaciones").insert(payload as never);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => { toast.success(editando ? "Recaudación modificada" : "Recaudación registrada"); setEditando(null); setForm({ fecha: hoyISO(), boca: OPCIONES_BOCA[0], cajero: "", importe: "", observaciones: "" }); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const anular = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("recaudaciones").update({ estado: "ANULADO" }).eq("id", id); if (error) throw new Error(error.message); }, onSuccess: () => { toast.success("Recaudación anulada"); void qc.invalidateQueries(); }, onError: (e: Error) => toast.error(e.message) });
  const filas = lista.data ?? [];
  const puedeEditar = (r: { created_by: string | null; cierre_id: string | null; estado: string }) => esAdmin || (r.created_by === user?.id && !r.cierre_id && r.estado === "RECAUDADO");
  const bocaTexto = (r: (typeof filas)[number]) => (r as typeof r & { boca_manual?: string }).boca_manual || r.bocas?.codigo || "-";
  const campo = editando ?? form;
  return <AppLayout titulo="Recaudaciones">
    <Panel titulo={editando ? "Modificar recaudación" : "Registrar cobranza"} extra={editando && <button className="btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>}>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
        <Campo label="Fecha"><input type="date" className="field" value={campo.fecha} onChange={(e) => editando ? setEditando({ ...editando, fecha: e.target.value }) : setForm({ ...form, fecha: e.target.value })} required /></Campo>
        <Campo label="Boca"><select className="field" value={campo.boca} onChange={(e) => editando ? setEditando({ ...editando, boca: e.target.value }) : setForm({ ...form, boca: e.target.value })}>{OPCIONES_BOCA.map((b) => <option key={b}>{b}</option>)}</select></Campo>
        <Campo label="Cajero"><input className="field" value={campo.cajero} placeholder={perfil?.nombre || "Cajero"} onChange={(e) => editando ? setEditando({ ...editando, cajero: e.target.value }) : setForm({ ...form, cajero: e.target.value })} /></Campo>
        <Campo label="Importe (ARS)"><input className="field" inputMode="decimal" value={campo.importe} onChange={(e) => editando ? setEditando({ ...editando, importe: e.target.value }) : setForm({ ...form, importe: e.target.value })} required /></Campo>
        <Campo label="Observaciones"><input className="field" value={campo.observaciones} onChange={(e) => editando ? setEditando({ ...editando, observaciones: e.target.value }) : setForm({ ...form, observaciones: e.target.value })} /></Campo>
        <button className="btn-primary sm:col-span-2 lg:col-span-5" disabled={guardar.isPending}>{guardar.isPending ? "Guardando…" : editando ? "Guardar cambios" : "Registrar recaudación"}</button>
      </form>
    </Panel>
    <Panel titulo="Listado" extra={<span className="label-xs text-muted-foreground">{filas.length} registros</span>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><Campo label="Desde"><input type="date" className="field" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} /></Campo><Campo label="Hasta"><input type="date" className="field" value={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} /></Campo><Campo label="Cajero"><input className="field" value={filtro.cajero} onChange={(e) => setFiltro({ ...filtro, cajero: e.target.value })} /></Campo></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="label-xs text-muted-foreground"><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Boca</th><th className="px-3 py-2 text-left">Cajero</th><th className="px-3 py-2 text-right">Importe</th><th className="px-3 py-2 text-right">Estado</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-border">{filas.map((r) => <tr key={r.id}><td className="px-3 py-2">{formatFecha(r.fecha)} {formatHora(r.hora)}</td><td className="px-3 py-2">{bocaTexto(r)}</td><td className="px-3 py-2">{r.cajero_nombre || "-"}</td><td className="num px-3 py-2 text-right">{formatARS(r.importe)}</td><td className="px-3 py-2 text-right"><Tag estado={r.estado} texto={etiquetaEstado[r.estado] ?? r.estado} /></td><td className="px-3 py-2 text-right">{puedeEditar(r) && r.estado !== "ANULADO" && <><button className="btn-ghost mr-2" onClick={() => setEditando({ id: r.id, fecha: r.fecha, boca: bocaTexto(r).startsWith("PUESTO") ? bocaTexto(r) : `PUESTO ${bocaTexto(r)}`, cajero: r.cajero_nombre ?? "", importe: String(r.importe), observaciones: r.observaciones ?? "" })}>Editar</button><button className="btn-ghost text-rose" onClick={() => window.confirm("¿Anular esta recaudación?") && anular.mutate(r.id)}>Eliminar</button></>}</td></tr>)}</tbody></table>{filas.length === 0 && <EstadoVacio texto="No hay recaudaciones para los filtros elegidos." />}</div>
    </Panel>
  </AppLayout>;
}
export function Campo({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="label-xs text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>; }
