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

  return (
    <AppLayout titulo="Acreditaciones">
      {esAdmin && (
        <Panel titulo={editandoId ? "Modificar acreditación registrada" : "Registrar acreditación"}>
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

      <Panel titulo="Acreditaciones registradas">
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
              {filas.map((a) => {
                const retirado = a.retiros ? Number(a.retiros.importe_retirado) : null;
                const diferencia = retirado === null ? null : Number(a.importe) - retirado;
                return (
                  <tr key={a.id} className="transition hover:bg-ink/5">
                    <td className="num px-3 py-2.5">{formatFecha(a.fecha_acreditacion)}</td>
                    <td className="num px-3 py-2.5">{a.retiros ? formatFecha(a.retiros.fecha) : "-"}</td>
                    <td className="px-3 py-2.5">{a.comprobante || "-"}</td>
                    <td className="num px-3 py-2.5 text-right">{retirado === null ? "-" : formatARS(retirado)}</td>
                    <td className="num px-3 py-2.5 text-right">{formatARS(a.importe)}</td>
                    <td className={`num px-3 py-2.5 text-right ${diferencia !== null && diferencia < 0 ? "text-rose" : ""}`}>
                      {diferencia === null ? "-" : formatARS(diferencia)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Tag estado={a.estado} texto={etiquetaEstado[a.estado] ?? a.estado} />
                    </td>
                    {esAdmin && (
                      <td className="px-3 py-2 text-center space-x-1 whitespace-nowrap">
                        <button className="btn-ghost py-0.5 text-xs" onClick={() => activarEdicion(a)}>
                          Editar
                        </button>
                        <button
                          className="btn-ghost py-0.5 text-xs text-rose hover:bg-rose/10"
                          disabled={eliminar.isPending}
                          onClick={() => {
                            if (window.confirm("¿Seguro que querés eliminar esta acreditación?")) eliminar.mutate(a.id);
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filas.length === 0 && <EstadoVacio texto="Todavía no hay acreditaciones registradas." />}
        </div>
      </Panel>
    </AppLayout>
  );
}
