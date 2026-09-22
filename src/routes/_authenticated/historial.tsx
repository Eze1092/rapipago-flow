import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { Campo } from "./recaudaciones";
import { useAuth } from "@/hooks/useAuth";
import { etiquetaEstado, obtenerAuditoria, obtenerHistorial } from "@/lib/data";
import { formatARS, formatFecha, formatFechaHora } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/historial")({
  head: () => ({
    meta: [
      { title: "Historial — Rapipago Caja" },
      { name: "description", content: "Historial completo de operaciones y auditoría de cambios." },
      { property: "og:title", content: "Historial — Rapipago Caja" },
      { property: "og:description", content: "Quién hizo cada movimiento, cuándo y con qué importe." },
    ],
  }),
  component: Historial,
});

function Historial() {
  const { esAdmin } = useAuth();
  const [rango, setRango] = useState({ desde: "", hasta: "" });
  const movimientos = useQuery({
    queryKey: ["historial", rango],
    queryFn: () => obtenerHistorial(rango.desde || undefined, rango.hasta || undefined),
  });
  const auditoria = useQuery({ queryKey: ["auditoria"], queryFn: obtenerAuditoria, enabled: esAdmin });

  const filas = movimientos.data ?? [];

  return (
    <AppLayout titulo="Historial">
      <Panel titulo="Movimientos" extra={<span className="label-xs text-muted-foreground">{filas.length} registros</span>}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Desde">
            <input type="date" className="field" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" className="field" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} />
          </Campo>
        </div>
        {filas.length === 0 ? (
          <EstadoVacio texto="Sin movimientos en el período elegido." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-normal">Fecha</th>
                  <th className="px-3 py-2 text-left font-normal">Tipo</th>
                  <th className="px-3 py-2 text-left font-normal">Boca</th>
                  <th className="px-3 py-2 text-left font-normal">Cajero</th>
                  <th className="px-3 py-2 text-left font-normal">Descripción</th>
                  <th className="px-3 py-2 text-right font-normal">Importe</th>
                  <th className="px-3 py-2 text-right font-normal">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.map((m) => (
                  <tr key={`${m.tipo}-${m.id}`} className="transition hover:bg-ink/5">
                    <td className="num px-3 py-2.5">{formatFecha(m.fecha)}</td>
                    <td className="px-3 py-2.5">{m.tipo}</td>
                    <td className="px-3 py-2.5">{m.boca ?? "-"}</td>
                    <td className="px-3 py-2.5">{m.cajero ?? "-"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{m.descripcion ?? "-"}</td>
                    <td className="num px-3 py-2.5 text-right">{formatARS(m.importe)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Tag estado={m.estado} texto={etiquetaEstado[m.estado] ?? m.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {esAdmin && (
        <Panel titulo="Auditoría de cambios">
          {(auditoria.data ?? []).length === 0 ? (
            <EstadoVacio texto="Todavía no se registraron cambios." />
          ) : (
            <div className="space-y-2">
              {(auditoria.data ?? []).map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                    <span className="text-foreground">{a.accion}</span>
                    <span>{a.tabla}</span>
                    <span>{formatFechaHora(a.created_at)}</span>
                    <span>{a.usuario_nombre ?? "Sistema"}</span>
                  </div>
                  {a.valores_anteriores && (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-ink/5 p-2 font-mono text-[10px] leading-relaxed">
                      Antes: {JSON.stringify(a.valores_anteriores)}
                    </pre>
                  )}
                  {a.valores_nuevos && (
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-ink/5 p-2 font-mono text-[10px] leading-relaxed">
                      Después: {JSON.stringify(a.valores_nuevos)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </AppLayout>
  );
}
