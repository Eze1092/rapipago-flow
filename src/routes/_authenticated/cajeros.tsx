import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Landmark, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AppLayout, Panel } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { obtenerBocas } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { formatARS, hoyISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cajeros")({
  component: CajeroAutomatico,
});

type Movimiento = {
  id: string; fecha: string; hora: string; boca_id: string | null;
  tipo: "CARGA" | "REINTEGRO"; importe: number; observaciones: string;
  estado: "REGISTRADO" | "ANULADO";
};

function CajeroAutomatico() {
  const { user, esAdmin } = useAuth();
  const qc = useQueryClient();
  const bocas = useQuery({ queryKey: ["bocas"], queryFn: obtenerBocas });
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ fecha: hoyISO(), tipo: "CARGA" as "CARGA" | "REINTEGRO", importe: "", observaciones: "", boca_id: "" });
  const [editando, setEditando] = useState<Movimiento | null>(null);

  // Estados para los filtros de fecha
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const cargar = async () => {
    setCargando(true);
    const { data, error } = await supabase.from("movimientos_atm").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setMovimientos((data ?? []) as Movimiento[]);
    setCargando(false);
  };
  useEffect(() => { void cargar(); }, []);
  useEffect(() => {
    const primeraBoca = bocas.data?.[0]?.id;
    if (!form.boca_id && primeraBoca) setForm((f) => ({ ...f, boca_id: primeraBoca }));
  }, [bocas.data, form.boca_id]);

  const guardar = useMutation({
    mutationFn: async (valor: typeof form) => {
      const importe = Number(valor.importe);
      if (!Number.isFinite(importe) || importe <= 0) throw new Error("El importe debe ser mayor a cero");
      const payload = { fecha: valor.fecha, tipo: valor.tipo, importe, observaciones: valor.observaciones, boca_id: valor.boca_id || null, created_by: user?.id ?? null };
      const result = editando
        ? await supabase.from("movimientos_atm").update(payload).eq("id", editando.id)
        : await supabase.from("movimientos_atm").insert({ ...payload, estado: "REGISTRADO" });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => { toast.success(editando ? "Movimiento modificado" : "Movimiento registrado"); setEditando(null); setForm({ fecha: hoyISO(), tipo: "CARGA", importe: "", observaciones: "", boca_id: bocas.data?.[0]?.id ?? "" }); void cargar(); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const eliminar = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("movimientos_atm").delete().eq("id", id); if (error) throw new Error(error.message); },
    onSuccess: () => { toast.success("Movimiento eliminado"); void cargar(); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const iniciarEdicion = (m: Movimiento) => { setEditando(m); setForm({ fecha: m.fecha, tipo: m.tipo, importe: String(m.importe), observaciones: m.observaciones ?? "", boca_id: m.boca_id ?? "" }); };

  // Lógica de filtrado por fechas en el cliente
  const movimientosFiltrados = movimientos.filter((m) => {
    if (desde && m.fecha < desde) return false;
    if (hasta && m.fecha > hasta) return false;
    return true;
  });

  // Cálculo del saldo acumulado neto filtrado (CARGA suma, REINTEGRO resta)
  const totalNetoFiltrado = movimientosFiltrados.reduce((acc, m) => {
    const valor = Number(m.importe) || 0;
    return m.tipo === "CARGA" ? acc + valor : acc - valor;
  }, 0);

  return <AppLayout titulo="Cajero Automático">
    <Panel titulo={editando ? "Editar movimiento ATM" : "Registrar movimiento ATM"} extra={editando && <button className="btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>}>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" onSubmit={(e) => { e.preventDefault(); guardar.mutate(form); }}>
        <label className="block"><span className="label-xs text-muted-foreground">Fecha</span><input type="date" className="field mt-1" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required /></label>
        <label className="block"><span className="label-xs text-muted-foreground">Boca</span><select className="field mt-1" value={form.boca_id} onChange={(e) => setForm({ ...form, boca_id: e.target.value })}><option value="">Sin boca</option>{(bocas.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.codigo}</option>)}</select></label>
        <label className="block"><span className="label-xs text-muted-foreground">Tipo</span><select className="field mt-1" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "CARGA" | "REINTEGRO" })}><option value="CARGA">CARGA (+)</option><option value="REINTEGRO">REINTEGRO (-)</option></select></label>
        <label className="block"><span className="label-xs text-muted-foreground">Importe</span><input type="number" min="0.01" step="0.01" className="field mt-1" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} required /></label>
        <label className="block lg:col-span-2"><span className="label-xs text-muted-foreground">Observaciones</span><input className="field mt-1" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} maxLength={200} /></label>
        <button className="btn-primary sm:col-span-2 lg:col-span-6" disabled={guardar.isPending}><Plus className="mr-1 inline size-4" />{guardar.isPending ? "Guardando…" : editando ? "Guardar cambios" : "Registrar"}</button>
      </form>
    </Panel>

    <Panel titulo="Movimientos registrados" extra={<button className="btn-ghost" onClick={() => void cargar()}><RefreshCw className={cargando ? "size-4 animate-spin" : "size-4"} /></button>}>
      {/* Sección estética de filtros por fecha */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 items-end mb-4 bg-muted/40 p-3 rounded-lg border border-border">
        <label className="block">
          <span className="label-xs text-muted-foreground">Desde</span>
          <input type="date" className="field mt-1" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className="block">
          <span className="label-xs text-muted-foreground">Hasta</span>
          <input type="date" className="field mt-1" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        {(desde || hasta) && (
          <button className="btn-ghost text-xs self-center sm:col-span-2 md:col-span-1 md:mt-5 text-rose h-10" onClick={() => { setDesde(""); setHasta(""); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Recuadro del Total Neto Dinámico */}
      <div className="flex justify-between items-center my-4 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
        <span className="text-base font-semibold text-gray-700">Saldo Neto ATM en el período:</span>
        <span className={`text-xl font-bold ${totalNetoFiltrado >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {formatARS(totalNetoFiltrado)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="label-xs text-muted-foreground">
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Boca</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-right">Importe</th>
              <th className="px-3 py-2 text-left">Observaciones</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movimientosFiltrados.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2">{m.fecha} {m.hora?.slice(0, 5)}</td>
                <td className="px-3 py-2">{bocas.data?.find((b) => b.id === m.boca_id)?.codigo ?? "-"}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.tipo === "CARGA" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {m.tipo}
                  </span>
                </td>
                <td className="num px-3 py-2 text-right">{formatARS(m.importe)}</td>
                <td className="px-3 py-2">{m.observaciones || "-"}</td>
                <td className="px-3 py-2 text-right">
                  <button className="btn-ghost mr-2" onClick={() => iniciarEdicion(m)} disabled={!esAdmin && m.estado !== "REGISTRADO"}><Pencil className="size-4" /></button>
                  <button className="btn-ghost text-rose" onClick={() => window.confirm("¿Eliminar este movimiento?") && eliminar.mutate(m.id)}><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && movimientosFiltrados.length === 0 && <p className="py-8 text-center text-muted-foreground">No hay movimientos registrados para las fechas seleccionadas.</p>}
      </div>
    </Panel>
  </AppLayout>;
}
