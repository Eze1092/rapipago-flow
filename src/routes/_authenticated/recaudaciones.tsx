import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { etiquetaEstado, obtenerBocas, obtenerRecaudaciones } from "@/lib/data";
import { formatARS, formatFecha, formatHora, hoyISO, parseImporte } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/recaudaciones")({
  head: () => ({
    meta: [
      { title: "Recaudaciones — Rapipago Caja" },
      { name: "description", content: "Registro y consulta de las recaudaciones diarias por boca y por cajero." },
      { property: "og:title", content: "Recaudaciones — Rapipago Caja" },
      { property: "og:description", content: "Alta, filtros y totales de las cobranzas del día." },
    ],
  }),
  component: Recaudaciones,
});

function Recaudaciones() {
  const { perfil, user, esAdmin } = useAuth();
  const qc = useQueryClient();
  const bocas = useQuery({ queryKey: ["bocas"], queryFn: obtenerBocas });

  const [filtro, setFiltro] = useState({ desde: "", hasta: "", bocaId: "", cajero: "" });
  const lista = useQuery({
    queryKey: ["recaudaciones", filtro],
    queryFn: () => {
      const args: { desde?: string; hasta?: string; bocaId?: string; cajero?: string } = {};
      if (filtro.desde) args.desde = filtro.desde;
      if (filtro.hasta) args.hasta = filtro.hasta;
      if (filtro.bocaId) args.bocaId = filtro.bocaId;
      if (filtro.cajero) args.cajero = filtro.cajero;
      return obtenerRecaudaciones(args);
    },
  });

  const [form, setForm] = useState({
    fecha: hoyISO(),
    bocaId: "",
    cajero: "",
    importe: "",
    observaciones: "",
  });

  const alta = useMutation({
    mutationFn: async () => {
      const importe = parseImporte(form.importe);
      if (!form.bocaId) throw new Error("Elegí una boca");
      if (!Number.isFinite(importe) || importe <= 0) throw new Error("El importe debe ser mayor a cero");
      const { error } = await supabase.from("recaudaciones").insert({
        fecha: form.fecha,
        boca_id: form.bocaId,
        cajero_id: user?.id ?? null,
        cajero_nombre: form.cajero || perfil?.nombre || "Sin asignar",
        importe,
        observaciones: form.observaciones,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Recaudación registrada");
      setForm((f) => ({ ...f, importe: "", observaciones: "" }));
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const anular = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recaudaciones").update({ estado: "ANULADO" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Movimiento anulado (el registro original se conserva)");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filas = lista.data ?? [];
  const total = filas
    .filter((r) => r.estado !== "ANULADO")
    .reduce((acc, r) => acc + Number(r.importe), 0);

  return (
    <AppLayout titulo="Recaudaciones">
      <Panel titulo="Registrar cobranza">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!window.confirm(`¿Confirmás registrar ${formatARS(parseImporte(form.importe))}?`)) return;
            alta.mutate();
          }}
        >
          <Campo label="Fecha">
            <input
              type="date"
              className="field"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              required
            />
          </Campo>
          <Campo label="Boca">
            <select
              className="field"
              value={form.bocaId}
              onChange={(e) => setForm({ ...form, bocaId: e.target.value })}
              required
            >
              <option value="">Elegir…</option>
              {(bocas.data ?? [])
                .filter((b) => b.activa)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.codigo}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo label="Cajero">
            <input
              className="field"
              placeholder={perfil?.nombre || "Cajero"}
              value={form.cajero}
              onChange={(e) => setForm({ ...form, cajero: e.target.value })}
              maxLength={80}
            />
          </Campo>
          <Campo label="Importe (ARS)">
            <input
              className="field"
              inputMode="decimal"
              placeholder="350000,00"
              value={form.importe}
              onChange={(e) => setForm({ ...form, importe: e.target.value })}
              required
            />
          </Campo>
          <Campo label="Observaciones">
            <input
              className="field"
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              maxLength={200}
            />
          </Campo>
          <div className="sm:col-span-2 lg:col-span-5">
            <button className="btn-primary" disabled={alta.isPending}>
              {alta.isPending ? "Registrando…" : "Registrar recaudación"}
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        titulo="Listado"
        extra={
          <span className="label-xs text-muted-foreground">
            {filas.length} registros · Total {formatARS(total)}
          </span>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Desde">
            <input type="date" className="field" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" className="field" value={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} />
          </Campo>
          <Campo label="Boca">
            <select className="field" value={filtro.bocaId} onChange={(e) => setFiltro({ ...filtro, bocaId: e.target.value })}>
              <option value="">Todas</option>
              {(bocas.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.codigo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Cajero">
            <input className="field" value={filtro.cajero} onChange={(e) => setFiltro({ ...filtro, cajero: e.target.value })} placeholder="Nombre" />
          </Campo>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-normal">Fecha</th>
                <th className="px-3 py-2 text-left font-normal">Hora</th>
                <th className="px-3 py-2 text-left font-normal">Boca</th>
                <th className="px-3 py-2 text-left font-normal">Cajero</th>
                <th className="px-3 py-2 text-left font-normal">Observaciones</th>
                <th className="px-3 py-2 text-right font-normal">Importe</th>
                <th className="px-3 py-2 text-right font-normal">Estado</th>
                {esAdmin && <th className="px-3 py-2 text-right font-normal">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((r) => (
                <tr key={r.id} className="transition hover:bg-ink/5">
                  <td className="num px-3 py-2.5">{formatFecha(r.fecha)}</td>
                  <td className="num px-3 py-2.5">{formatHora(r.hora)}</td>
                  <td className="px-3 py-2.5">{r.bocas?.codigo ?? "-"}</td>
                  <td className="px-3 py-2.5">{r.cajero_nombre || "-"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.observaciones || "-"}</td>
                  <td className="num px-3 py-2.5 text-right">{formatARS(r.importe)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Tag estado={r.estado} texto={etiquetaEstado[r.estado] ?? r.estado} />
                  </td>
                  {esAdmin && (
                    <td className="px-3 py-2.5 text-right">
                      {r.estado !== "ANULADO" && (
                        <button
                          className="btn-ghost"
                          onClick={() => {
                            if (window.confirm("¿Anular esta recaudación? El registro se conserva en el historial."))
                              anular.mutate(r.id);
                          }}
                        >
                          Anular
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filas.length === 0 && <EstadoVacio texto="No hay recaudaciones para los filtros elegidos." />}
        </div>
      </Panel>
    </AppLayout>
  );
}

export function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-xs text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
