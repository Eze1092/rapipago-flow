import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { Campo } from "./recaudaciones";
import {
  etiquetaEstado,
  obtenerBocas,
  obtenerHistorial,
  obtenerResumen,
  obtenerResumenPorBoca,
  obtenerResumenPorCajero,
} from "@/lib/data";
import { descargarCSV, formatARS, formatFecha } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — Rapipago Caja" },
      { name: "description", content: "Reportes por período, boca, cajero, retiros, acreditaciones y diferencias." },
      { property: "og:title", content: "Reportes — Rapipago Caja" },
      { property: "og:description", content: "Exportación a Excel/CSV de todos los movimientos." },
    ],
  }),
  component: Reportes,
});

const TIPOS = ["Todos", "RECAUDACION", "RETIRO", "ACREDITACION", "AJUSTE", "CIERRE"];

function Reportes() {
  const [f, setF] = useState({ desde: "", hasta: "", boca: "", cajero: "", tipo: "Todos", estado: "" });

  const bocas = useQuery({ queryKey: ["bocas"], queryFn: obtenerBocas });
  const resumen = useQuery({ queryKey: ["resumen"], queryFn: obtenerResumen });
  const porBoca = useQuery({
    queryKey: ["resumen-boca", f.desde, f.hasta],
    queryFn: () => obtenerResumenPorBoca(f.desde || undefined, f.hasta || undefined),
  });
  const porCajero = useQuery({
    queryKey: ["resumen-cajero", f.desde, f.hasta],
    queryFn: () => obtenerResumenPorCajero(f.desde || undefined, f.hasta || undefined),
  });
  const historial = useQuery({
    queryKey: ["historial-reportes", f.desde, f.hasta],
    queryFn: () => obtenerHistorial(f.desde || undefined, f.hasta || undefined),
  });

  const filas = useMemo(() => {
    return (historial.data ?? []).filter((m) => {
      if (f.tipo !== "Todos" && m.tipo !== f.tipo) return false;
      if (f.boca && m.boca !== f.boca) return false;
      if (f.cajero && !(m.cajero ?? "").toLowerCase().includes(f.cajero.toLowerCase())) return false;
      if (f.estado && m.estado !== f.estado) return false;
      return true;
    });
  }, [historial.data, f]);

  const total = filas.reduce((acc, m) => acc + Number(m.importe), 0);

  const exportar = () => {
    descargarCSV(
      `reporte-${f.desde || "inicio"}-${f.hasta || "hoy"}.csv`,
      ["Fecha", "Tipo", "Boca", "Cajero", "Descripcion", "Importe", "Estado"],
      filas.map((m) => [
        formatFecha(m.fecha),
        m.tipo,
        m.boca ?? "",
        m.cajero ?? "",
        m.descripcion ?? "",
        Number(m.importe).toFixed(2).replace(".", ","),
        etiquetaEstado[m.estado] ?? m.estado,
      ]),
    );
  };

  const r = resumen.data;

  return (
    <AppLayout titulo="Reportes">
      <Panel titulo="Filtros">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Campo label="Desde">
            <input type="date" className="field" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" className="field" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} />
          </Campo>
          <Campo label="Boca">
            <select className="field" value={f.boca} onChange={(e) => setF({ ...f, boca: e.target.value })}>
              <option value="">Todas</option>
              {(bocas.data ?? []).map((b) => (
                <option key={b.id} value={b.codigo}>
                  {b.codigo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Cajero">
            <input className="field" value={f.cajero} onChange={(e) => setF({ ...f, cajero: e.target.value })} />
          </Campo>
          <Campo label="Tipo de movimiento">
            <select className="field" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t === "Todos" ? "Todos" : t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={exportar} disabled={filas.length === 0}>
            Exportar a Excel/CSV
          </button>
          <button className="btn-ghost" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Balance general">
          <ul className="space-y-2 text-sm">
            <Linea titulo="Recaudado" valor={formatARS(r?.recaudado_total)} />
            <Linea titulo="Retirado" valor={formatARS(r?.retirado_total)} />
            <Linea titulo="Acreditado" valor={formatARS(r?.acreditado_total)} />
            <Linea titulo="Pendiente de acreditación" valor={formatARS(r?.pendiente_acreditacion)} />
            <Linea titulo="Diferencias" valor={formatARS(r?.diferencias)} />
            <Linea titulo="Saldo" valor={formatARS(r?.saldo)} />
          </ul>
        </Panel>
        <Panel titulo="Totales del período">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="label-xs text-muted-foreground">Por boca</div>
              <ul className="mt-2 space-y-1 text-sm">
                {(porBoca.data ?? []).map((b) => (
                  <li key={b.codigo} className="flex justify-between">
                    <span>Boca {b.codigo}</span>
                    <span className="num">{formatARS(b.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="label-xs text-muted-foreground">Por cajero</div>
              <ul className="mt-2 space-y-1 text-sm">
                {(porCajero.data ?? []).map((c) => (
                  <li key={c.cajero} className="flex justify-between">
                    <span>{c.cajero}</span>
                    <span className="num">{formatARS(c.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        titulo="Detalle de movimientos"
        extra={
          <span className="label-xs text-muted-foreground">
            {filas.length} registros · {formatARS(total)}
          </span>
        }
      >
        {filas.length === 0 ? (
          <EstadoVacio texto="No hay movimientos para los filtros elegidos." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-normal">Fecha</th>
                  <th className="px-3 py-2 text-left font-normal">Tipo</th>
                  <th className="px-3 py-2 text-left font-normal">Boca</th>
                  <th className="px-3 py-2 text-left font-normal">Cajero</th>
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
    </AppLayout>
  );
}

function Linea({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <li className="flex justify-between border-b border-border pb-1.5">
      <span className="text-muted-foreground">{titulo}</span>
      <span className="num font-bold">{valor}</span>
    </li>
  );
}
