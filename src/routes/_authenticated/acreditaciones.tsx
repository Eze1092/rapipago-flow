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

  const [form, setForm] = useState({
    fecha: hoyISO(),
    importe: "",
    comprobante: "",
    observaciones: "",
  });

  const alta = useMutation({
    mutationFn: async () => {
      const importe = parseImporte(form.importe);
      if (!Number.isFinite(importe) || importe < 0) throw new Error("Importe inválido");

      const { error } = await supabase.from("acreditaciones").insert({
        fecha_acreditacion: form.fecha,
        importe,
        comprobante: form.comprobante,
        observaciones: form.observaciones,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Acreditación registrada");
      setForm({ fecha: hoyISO(), importe: "", comprobante: "", observaciones: "" });
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filas = lista.data ?? [];

  return (
    <AppLayout titulo="Acreditaciones">
      {esAdmin && (
        <Panel
          titulo="Registrar acreditación"
        >
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!window.confirm(`¿Confirmás la acreditación de ${formatARS(parseImporte(form.importe))}?`)) return;
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
            <div className="sm:col-span-2 lg:col-span-4">
              <button className="btn-primary" disabled={alta.isPending}>
                {alta.isPending ? "Registrando…" : "Registrar acreditación"}
              </button>
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
