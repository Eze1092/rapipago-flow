import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { Campo } from "./recaudaciones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { etiquetaEstado, obtenerBocas, obtenerRetiros } from "@/lib/data";
import { formatARS, formatFecha, formatHora, hoyISO, parseImporte } from "@/lib/format";
import { Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/retiros")({
  head: () => ({
    meta: [
      { title: "Retiros del camión — Rapipago Caja" },
      { name: "description", content: "Registro de los retiros del camión recaudador y su estado de acreditación." },
      { property: "og:title", content: "Retiros del camión — Rapipago Caja" },
      { property: "og:description", content: "Importe declarado, importe retirado y remito de cada retiro." },
    ],
  }),
  component: Retiros,
});

function Retiros() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const bocas = useQuery({ queryKey: ["bocas"], queryFn: obtenerBocas });
  const lista = useQuery({ queryKey: ["retiros"], queryFn: obtenerRetiros });
  
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ fecha: hoyISO(), declarado: "", retirado: "", remito: "", observaciones: "", bocas: [] as string[] });

  // Estados para los filtros de fecha
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // MUTACIÓN PARA REGISTRAR O EDITAR RETIRO
  const alta = useMutation({
    mutationFn: async () => {
      const declarado = parseImporte(form.declarado);
      const retirado = parseImporte(form.retirado);
      if (!Number.isFinite(declarado) || declarado < 0) throw new Error("Importe declarado inválido");
      if (!Number.isFinite(retirado) || retirado < 0) throw new Error("Importe retirado inválido");

      if (editandoId) {
        // Modo Edición
        const { error } = await supabase
          .from("retiros")
          .update({
            fecha: form.fecha,
            importe_declarado: declarado,
            importe_retirado: retirado,
            remito: form.remito,
            observaciones: form.observaciones
          })
          .eq("id", editandoId);
        if (error) throw new Error(error.message);
      } else {
        // Modo Registro Nuevo
        const { data, error } = await supabase
          .from("retiros")
          .insert({ fecha: form.fecha, importe_declarado: declarado, importe_retirado: retirado, remito: form.remito, observaciones: form.observaciones })
          .select("id")
          .single();
        if (error) throw new Error(error.message);

        const retiroId = (data as { id: string }).id;

        if (form.bocas.length > 0) {
          const { error: e2 } = await supabase
            .from("retiro_bocas")
            .insert(form.bocas.map((bocaId) => ({ retiro_id: retiroId, boca_id: bocaId })));
          if (e2) throw new Error(e2.message);

          const { error: e3 } = await supabase
            .from("recaudaciones")
            .update({ estado: "RETIRADO", retiro_id: retiroId })
            .in("boca_id", form.bocas)
            .eq("estado", "RECAUDADO")
            .lte("fecha", form.fecha);
          if (e3) throw new Error(e3.message);
        }
      }
    },
    onSuccess: () => {
      toast.success(editandoId ? "Retiro modificado" : "Retiro registrado con éxito");
      setForm({ fecha: hoyISO(), declarado: "", retirado: "", remito: "", observaciones: "", bocas: [] });
      setEditandoId(null);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // MUTACIÓN PARA ELIMINAR RETIRO
  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("retiros").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Retiro eliminado");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activarEdicion = (r: any) => {
    setEditandoId(r.id);
    setForm({
      fecha: r.fecha,
      declarado: String(r.importe_declarado),
      retirado: String(r.importe_retirado),
      remito: r.remito || "",
      observaciones: r.observaciones || "",
      bocas: (r.retiro_bocas ?? []).map((rb: any) => rb.boca_id).filter(Boolean),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filas = lista.data ?? [];

  // Lógica de filtrado por fechas en frontend
  const filasFiltradas = filas.filter((r: any) => {
    if (desde && r.fecha < desde) return false;
    if (hasta && r.fecha > hasta) return false;
    return true;
  });

  // Sumas dinámicas de lo que queda filtrado en pantalla
  const totalDeclaradoFiltrado = filasFiltradas.reduce((acc, r: any) => acc + (Number(r.importe_declarado) || 0), 0);
  const totalRetiradoFiltrado = filasFiltradas.reduce((acc, r: any) => acc + (Number(r.importe_retirado) || 0), 0);

  return (
    <AppLayout titulo="Retiros del camión">
      {esAdmin && (
        <Panel titulo={editandoId ? "Modificar retiro registrado" : "Registrar retiro"}>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => { e.preventDefault(); if (!window.confirm(`¿Confirmás los datos de este retiro por ${formatARS(parseImporte(form.retirado))}?`)) return; alta.mutate(); }}>
            <Campo label="Fecha"><input type="date" className="field" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required /></Campo>
            <Campo label="Importe declarado"><input className="field" inputMode="decimal" value={form.declarado} onChange={(e) => setForm({ ...form, declarado: e.target.value })} required /></Campo>
            <Campo label="Importe retirado"><input className="field" inputMode="decimal" value={form.retirado} onChange={(e) => setForm({ ...form, retirado: e.target.value })} required /></Campo>
            <Campo label="N° de remito"><input className="field" value={form.remito} onChange={(e) => setForm({ ...form, remito: e.target.value })} maxLength={50} /></Campo>
            <Campo label="Observaciones"><input className="field" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} maxLength={200} /></Campo>
            <div className="sm:col-span-2 lg:col-span-3"><span className="label-xs text-muted-foreground">Bocas incluidas (opcional)</span><div className="mt-2 flex flex-wrap gap-2"><button type="button" className={form.bocas.length === 0 ? "rounded-lg bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-cream" : "btn-ghost"} onClick={() => setForm({ ...form, bocas: [] })}>Sin boca</button>{(bocas.data ?? []).map((b) => { const elegida = form.bocas.includes(b.id); return <button type="button" key={b.id} onClick={() => setForm({ ...form, bocas: elegida ? form.bocas.filter((x) => x !== b.id) : [...form.bocas, b.id] })} className={elegida ? "rounded-lg bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-cream" : "btn-ghost"} disabled={!!editandoId}>{b.codigo}</button>; })}</div></div>
            <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
              <button className="btn-primary" disabled={alta.isPending}>{alta.isPending ? "Procesando…" : editandoId ? "Guardar cambios" : "Registrar retiro"}</button>
              {editandoId && <button type="button" className="btn-ghost" onClick={() => { setEditandoId(null); setForm({ fecha: hoyISO(), declarado: "", retirado: "", remito: "", observaciones: "", bocas: [] }); }}>Cancelar</button>}
            </div>
          </form>
        </Panel>
      )}

      <Panel titulo="Retiros registrados" extra={<span className="label-xs text-muted-foreground">{filasFiltradas.length} registros</span>}>
        {/* Contenedor de Filtros por Fecha */}
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

        {/* Recuadro de los Totales Acumulados del período */}
        <div className="grid gap-4 sm:grid-cols-2 my-4 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
          <div className="flex justify-between items-center border-b sm:border-b-0 sm:border-r border-orange-200 pb-2 sm:pb-0 sm:pr-4">
            <span className="text-sm font-semibold text-gray-700">Total Declarado:</span>
            <span className="text-lg font-bold text-amber-700">{formatARS(totalDeclaradoFiltrado)}</span>
          </div>
          <div className="flex justify-between items-center sm:pl-4">
            <span className="text-sm font-semibold text-gray-700">Total Retirado:</span>
            <span className="text-lg font-bold text-orange-600">{formatARS(totalRetiradoFiltrado)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
