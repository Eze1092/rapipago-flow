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

  const [form, setForm] = useState({
    fecha: hoyISO(),
    declarado: "",
    retirado: "",
    remito: "",
    observaciones: "",
    bocas: [] as string[],
  });

  const alta = useMutation({
    mutationFn: async () => {
      const declarado = parseImporte(form.declarado);
      const retirado = parseImporte(form.retirado);
      if (!Number.isFinite(declarado) || declarado < 0) throw new Error("Importe declarado inválido");
      if (!Number.isFinite(retirado) || retirado < 0) throw new Error("Importe retirado inválido");
      if (form.bocas.length === 0) throw new Error("Elegí al menos una boca");

      const { data, error } = await supabase
        .from("retiros")
        .insert({
          fecha: form.fecha,
          importe_declarado: declarado,
          importe_retirado: retirado,
          remito: form.remito,
          observaciones: form.observaciones,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      const retiroId = (data as { id: string }).id;
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
    },
    onSuccess: () => {
      toast.success("Retiro registrado. Queda pendiente de acreditación.");
      setForm({ fecha: hoyISO(), declarado: "", retirado: "", remito: "", observaciones: "", bocas: [] });
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filas = lista.data ?? [];

  return (
    <AppLayout titulo="Retiros del camión">
      {esAdmin && (
        <Panel titulo="Registrar retiro">
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!window.confirm(`¿Confirmás el retiro de ${formatARS(parseImporte(form.retirado))}?`)) return;
              alta.mutate();
            }}
          >
            <Campo label="Fecha">
              <input type="date" className="field" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </Campo>
            <Campo label="Importe declarado">
              <input className="field" inputMode="decimal" value={form.declarado} onChange={(e) => setForm({ ...form, declarado: e.target.value })} required />
            </Campo>
            <Campo label="Importe retirado">
              <input className="field" inputMode="decimal" value={form.retirado} onChange={(e) => setForm({ ...form, retirado: e.target.value })} required />
            </Campo>
            <Campo label="N° de remito">
              <input className="field" value={form.remito} onChange={(e) => setForm({ ...form, remito: e.target.value })} maxLength={50} />
            </Campo>
            <Campo label="Observaciones">
              <input className="field" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} maxLength={200} />
            </Campo>
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="label-xs text-muted-foreground">Bocas incluidas</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(bocas.data ?? []).map((b) => {
                  const elegida = form.bocas.includes(b.id);
                  return (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() =>
                        setForm({
                          ...form,
                          bocas: elegida ? form.bocas.filter((x) => x !== b.id) : [...form.bocas, b.id],
                        })
                      }
                      className={
                        elegida
                          ? "rounded-lg bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-cream"
                          : "btn-ghost"
                      }
                    >
                      {b.codigo}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button className="btn-primary" disabled={alta.isPending}>
                {alta.isPending ? "Registrando…" : "Registrar retiro"}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel titulo="Retiros registrados" extra={<span className="label-xs text-muted-foreground">{filas.length} registros</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-normal">Fecha</th>
                <th className="px-3 py-2 text-left font-normal">Hora</th>
                <th className="px-3 py-2 text-left font-normal">Bocas</th>
                <th className="px-3 py-2 text-left font-normal">Remito</th>
                <th className="px-3 py-2 text-right font-normal">Declarado</th>
                <th className="px-3 py-2 text-right font-normal">Retirado</th>
                <th className="px-3 py-2 text-right font-normal">Acreditado</th>
                <th className="px-3 py-2 text-right font-normal">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((r) => {
                const acreditado = (r.acreditaciones ?? [])
                  .filter((a) => a.estado !== "ANULADO")
                  .reduce((acc, a) => acc + Number(a.importe), 0);
                return (
                  <tr key={r.id} className="transition hover:bg-ink/5">
                    <td className="num px-3 py-2.5">{formatFecha(r.fecha)}</td>
                    <td className="num px-3 py-2.5">{formatHora(r.hora)}</td>
                    <td className="px-3 py-2.5">
                      {(r.retiro_bocas ?? []).map((rb) => rb.bocas?.codigo).filter(Boolean).join(" + ") || "-"}
                    </td>
                    <td className="px-3 py-2.5">{r.remito || "-"}</td>
                    <td className="num px-3 py-2.5 text-right">{formatARS(r.importe_declarado)}</td>
                    <td className="num px-3 py-2.5 text-right">{formatARS(r.importe_retirado)}</td>
                    <td className="num px-3 py-2.5 text-right">{formatARS(acreditado)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Tag estado={r.estado} texto={etiquetaEstado[r.estado] ?? r.estado} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filas.length === 0 && <EstadoVacio texto="Todavía no se registraron retiros." />}
        </div>
      </Panel>
    </AppLayout>
  );
}
