import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { Campo } from "./recaudaciones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { etiquetaEstado, obtenerAcreditaciones } from "@/lib/data";
import { formatARS, formatFecha, hoyISO, parseImporte } from "@/lib/format";
import { Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/acreditaciones")({
  head: () => ({
    meta: [
      { title: "Acreditaciones — Rapipago Caja" },
      { name: "description", content: "Acreditaciones de la empresa y diferencias contra los retiros del camión." },
      { property: "og:title", content: "Acreditaciones — Rapipago Caja" },
      { property: "og:description", content: "Importe acreditado, comprobante y diferencia detectada." },
    ],
  }),
  component: Acreditaciones,
});

function Acreditaciones() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ["acreditaciones"], queryFn: obtenerAcreditaciones });

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha: hoyISO(),
    importe: "",
    comprobante: "",
    observaciones: "",
  });

  // Estados para los filtros de fecha
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // MUTACIÓN PARA REGISTRAR O MODIFICAR ACREDITACIÓN
  const alta = useMutation({
    mutationFn: async () => {
      const importe = parseImporte(form.importe);
      if (!Number.isFinite(importe) || importe < 0) throw new Error("Importe inválido");

      if (editandoId) {
        // Modo Edición
        const { error } = await supabase
          .from("acreditaciones")
          .update({
            fecha_acreditacion: form.fecha,
            importe,
            comprobante: form.comprobante,
            observaciones: form.observaciones,
          })
          .eq("id", editandoId);
        if (error) throw new Error(error.message);
      } else {
        // Modo Registro Nuevo
        const { error } = await supabase.from("acreditaciones").insert({
          fecha_acreditacion: form.fecha,
          importe,
          comprobante: form.comprobante,
          observaciones: form.observaciones,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(editandoId ? "Acreditación modificada" : "Acreditación registrada con éxito");
      setForm({ fecha: hoyISO(), importe: "", comprobante: "", observaciones: "" });
      setEditandoId(null);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // MUTACIÓN PARA ELIMINAR ACREDITACIÓN
  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("acreditaciones").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Acreditación eliminada");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activarEdicion = (a: any) => {
    setEditandoId(a.id);
    setForm({
      fecha: a.fecha_acreditacion ? a.fecha_acreditacion.substring(0, 10) : hoyISO(),
      importe: String(a.importe),
      comprobante: a.comprobante || "",
      observaciones: a.observaciones || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filas = lista.data ?? [];

  // Lógica de filtrado dinámico por fechas en frontend
  const filasFiltradas = filas.filter((a: any) => {
    if (!a.fecha_acreditacion) return true;
    const fechaSolo = a.fecha_acreditacion.substring(0, 10);
    if (desde && fechaSolo < desde) return false;
    if (hasta && fechaSolo > hasta) return false;
    return true;
  });

  // Cálculos acumulados dinámicos
  const totalAcreditadoFiltrado = filasFiltradas.reduce((acc, a: any) => acc + (Number(a.importe) || 0), 0);
  const totalDiferenciaFiltrada = filasFiltradas.reduce((acc, a: any) => {
    const retirado = a.retiros ? Number(a.retiros.importe_retirado) : null;
    if (retirado === null) return acc;
    return acc + (Number(a.importe) - retirado);
  }, 0);

  return (
    <AppLayout titulo="Acreditaciones">
      {esAdmin && (
        <Panel titulo={editandoId ? "Modificar accreditation registrada" : "Registrar acreditación"}>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!window.confirm(`¿Confirmás los datos de esta acreditación por ${formatARS(parseImporte(form.importe))}?`)) return;
              alta.mutate();
            }}
          >
            <Campo label="Fecha de acreditación">
              <input type="date" className="field" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </Campo>
            <Campo label="Importe acreditado">
              <input className="field" inputMode="decimal" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} required />
            </Campo>
            <Campo label="N° de operación">
              <input className="field" value={form.comprobante} onChange={(e) => setForm({ ...form, comprobante: e.target.value })} maxLength={50} />
            </Campo>
            <Campo label="Observaciones">
              <input className="field" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} maxLength={200} />
            </Campo>
            <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
              <button className="btn-primary" disabled={alta.isPending}>
                {alta.isPending ? "Procesando…" : editandoId ? "Guardar cambios" : "Registrar acreditación"}
              </button>
              {editandoId && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditandoId(null);
                    setForm({ fecha: hoyISO(), importe: "", comprobante: "", observaciones: "" });
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </Panel>
      )}

      <Panel titulo="Acreditaciones registradas" extra={<span className="label-xs text-muted-foreground">{filasFiltradas.length} registros</span>}>
        {/* Sección de Filtros por Fecha */}
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

        {/* Recuadro de los Totales Acumulados */}
        <div className="grid gap-4 sm:grid-cols-2 my-4 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
          <div className="flex justify-between items-center border-b sm:border-b-0 sm:border-r border-orange-200 pb-2 sm:pb-0 sm:pr-4">
            <span className="text-sm font-semibold text-gray-700">Total Acreditado:</span>
            <span className="text-lg font-bold text-orange-600">{formatARS(totalAcreditadoFiltrado)}</span>
          </div>
          <div className="flex justify-between items-center sm:pl-4">
            <span className="text-sm font-semibold text-gray-700">Diferencia Acumulada:</span>
            <span className={`text-lg font-bold ${totalDiferenciaFiltrada < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {formatARS(totalDiferenciaFiltrada)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-normal">Fecha acreditación</th>
                <th className="px-3 py-2 text-left font-normal">Fecha del retiro</th>
                <th className="px-3 py-2 text-left font-normal">Comprobante</th>
                <th className="px-3 py-2 text-right font-normal">Retirado</th>
                <th className="px-3 py-2 text-right font-normal">Acreditado</th>
                <th className="px-3 py-2 text-right font-normal">Diferencia</th>
                <th className="px-3 py-2 text-right font-normal">Estado</th>
                {esAdmin && <th className="px-3 py-2 text-center font-normal">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filasFiltradas.map((a: any) => {
                const retirado = a.retiros ? Number(a.retiros.importe_retirado) : null;
                const diferencia = retirado === null ? null : Number(a.importe) - retirado;
                return (
                  <tr key={a.id} className="transition hover:bg-ink/5">
                    <td className="num px-3 py-2.5">{formatFecha(a.fecha_acreditacion)}</td>
