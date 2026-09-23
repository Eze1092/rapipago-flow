import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { etiquetaEstado, obtenerBocas, obtenerRecaudaciones } from "@/lib/data";
import { formatARS, formatFecha, formatHora, hoyISO, parseImporte } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/recaudaciones")({ component: Recaudaciones });
const OPCIONES_BOCA = ["PUESTO 41159", "PUESTO 42278"] as const;

type Edicion = { id: string; fecha: string; boca: string; cajero: string; importe: string; observaciones: string };
type Fila = Awaited<ReturnType<typeof obtenerRecaudaciones>>[number];

function Recaudaciones() {
  const { perfil, user, esAdmin } = useAuth();
  const qc = useQueryClient();
  const bocas = useQuery({ queryKey: ["bocas"], queryFn: obtenerBocas });
  const [filtro, setFiltro] = useState({ desde: "", hasta: "", cajero: "" });
  const lista = useQuery({
    queryKey: ["recaudaciones", filtro],
    queryFn: () => obtenerRecaudaciones({ desde: filtro.desde || undefined, hasta: filtro.hasta || undefined, cajero: filtro.cajero || undefined }),
  });
  const [form, setForm] = useState({ fecha: hoyISO(), boca: OPCIONES_BOCA[0], cajero: "", importe: "", observaciones: "" });
  const [editando, setEditando] = useState<Edicion | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      const v = editando ?? form;
      const importe = parseImporte(v.importe);
      if (!Number.isFinite(importe) || importe <= 0) throw new Error("El importe debe ser mayor a cero");
      const codigo = v.boca.replace(/^PUESTO\s+/, "");
      const bocaId = bocas.data?.find((b) => b.codigo === codigo)?.id;
      if (!bocaId) throw new Error("No se encontró la boca seleccionada");
      const payload = {
        fecha: v.fecha,
        boca_id: bocaId,
        cajero_id: user?.id ?? null,
        cajero_nombre: v.cajero.trim() || perfil?.nombre || "Sin asignar",
        importe,
        observaciones: v.observaciones.trim(),
      };
      // No enviar created_by, boca_manual ni cierre_id: no existen en la tabla instalada.
      const result = editando
        ? await supabase.from("recaudaciones").update(payload as never).eq("id", editando.id)
        : await supabase.from("recaudaciones").insert(payload as never);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      toast.success(editando ? "Recaudación modificada" : "Recaudación registrada");
      setEditando(null);
      setForm({ fecha: hoyISO(), boca: OPCIONES_BOCA[0], cajero: "", importe: "", observaciones: "" });
      void qc.invalidateQueries({ queryKey: ["recaudaciones"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recaudaciones").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Recaudación eliminada");
      setEditando(null);
      void qc.invalidateQueries({ queryKey: ["recaudaciones"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filas = lista.data ?? [];
  const bocaTexto = (r: Fila) => (r as Fila & { boca_manual?: string }).boca_manual || r.bocas?.codigo || "-";
  // El único usuario es administrador: puede modificar y eliminar cualquier fila.
  const puedeModificar = (_r: Fila) => esAdmin;
  const iniciarEdicion = (r: Fila) => {
    const boca = bocaTexto(r);
    setEditando({
      id: r.id,
      fecha: r.fecha,
      boca: boca.startsWith("PUESTO") ? boca : `PUESTO ${boca}`,
      cajero: r.cajero_nombre ?? "",
      importe: String(r.importe),
      observaciones: r.observaciones ?? "",
    });
  };
  const campo = editando ?? form;
  const cambiar = (nombre: keyof Omit<Edicion, "id">, valor: string) => {
    if (editando) setEditando({ ...editando, [nombre]: valor });
    else setForm({ ...form, [nombre]: valor });
  };

  return <AppLayout titulo="Recaudaciones">
    <Panel titulo={editando ? "Modificar recaudación" : "Registrar cobranza"} extra={editando && <button type="button" className="btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>}>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
        <Campo label="Fecha"><input type="date" className="field" value={campo.fecha} onChange={(e) => cambiar("fecha", e.target.value)} required /></Campo>
        <Campo label="Boca"><select className="field" value={campo.boca} onChange={(e) => cambiar("boca", e.target.value)}>{OPCIONES_BOCA.map((b) => <option key={b}>{b}</option>)}</select></Campo>
        <Campo label="Cajero"><input className="field" value={campo.cajero} placeholder={perfil?.nombre || "Cajero"} onChange={(e) => cambiar("cajero", e.target.value)} /></Campo>
        <Campo label="Importe (ARS)"><input className="field" inputMode="decimal" value={campo.importe} onChange={(e) => cambiar("importe", e.target.value)} required /></Campo>
        <Campo label="Observaciones"><input className="field" value={campo.observaciones} onChange={(e) => cambiar("observaciones", e.target.value)} /></Campo>
        <button className="btn-primary sm:col-span-2 lg:col-span-5" disabled={guardar.isPending}>{guardar.isPending ? "Guardando…" : editando ? "Guardar cambios" : "Registrar recaudación"}</button>
      </form>
    </Panel>
    <Panel titulo="Listado" extra={<span className="label-xs text-muted-foreground">{filas.length} registros</span>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><Campo label="Desde"><input type="date" className="field" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} /></Campo><Campo label="Hasta"><input type="date" className="field" value={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} /></Campo><Campo label="Cajero"><input className="field" value={filtro.cajero} onChange={(e) => setFiltro({ ...filtro, cajero: e.target.value })} /></Campo></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="label-xs text-muted-foreground"><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Boca</th><th className="px-3 py-2 text-left">Cajero</th><th className="px-3 py-2 text-right">Importe</th><th className="px-3 py-2 text-right">Estado</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-border">{filas.map((r) => <tr key={r.id}><td className="px-3 py-2">{formatFecha(r.fecha)} {formatHora(r.hora)}</td><td className="px-3 py-2">{bocaTexto(r)}</td><td className="px-3 py-2">{r.cajero_nombre || "-"}</td><td className="num px-3 py-2 text-right">{formatARS(r.importe)}</td><td className="px-3 py-2 text-right"><Tag estado={r.estado} texto={etiquetaEstado[r.estado] ?? r.estado} /></td><td className="px-3 py-2 text-right">{puedeModificar(r) && <><button type="button" className="btn-ghost mr-2" onClick={() => iniciarEdicion(r)}>Editar</button><button type="button" className="btn-ghost text-rose" disabled={eliminar.isPending} onClick={() => window.confirm("¿Eliminar definitivamente esta recaudación?") && eliminar.mutate(r.id)}>Eliminar</button></>}</td></tr>)}</tbody></table>{filas.length === 0 && <EstadoVacio texto="No hay recaudaciones para los filtros elegidos." />}</div>
    </Panel>
  </AppLayout>;
}

export function Campo({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="label-xs text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>; }
