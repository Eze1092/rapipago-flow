import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { formatARS, formatFecha, formatNumero } from "@/lib/format";
import {
  etiquetaEstado,
  obtenerHistorial,
  obtenerResumen,
  obtenerResumenPorBoca,
  obtenerResumenPorCajero,
  obtenerSerieDiaria,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Inicio — Rapipago Caja" },
      { name: "description", content: "Panel con la recaudación del día, retiros, acreditaciones y saldo." },
      { property: "og:title", content: "Inicio — Rapipago Caja" },
      { property: "og:description", content: "Recaudación, retiros, acreditaciones y diferencias en un vistazo." },
    ],
  }),
  component: Inicio,
});

function Kpi({
  titulo,
  valor,
  nota,
  clase,
}: {
  titulo: string;
  valor: string;
  nota: string;
  clase: string;
}) {
  return (
    <div className={`rise rounded-2xl p-4 ${clase}`}>
      <div className="label-xs opacity-70">{titulo}</div>
      <div className="num mt-2 text-lg font-bold">{valor}</div>
      <div className="mt-1 font-mono text-[11px] opacity-70">{nota}</div>
    </div>
  );
}

function Inicio() {
  const resumen = useQuery({ queryKey: ["resumen"], queryFn: obtenerResumen });
  const serie = useQuery({ queryKey: ["serie", 14], queryFn: () => obtenerSerieDiaria(14) });
  const porBoca = useQuery({ queryKey: ["resumen-boca"], queryFn: () => obtenerResumenPorBoca() });
  const porCajero = useQuery({ queryKey: ["resumen-cajero"], queryFn: () => obtenerResumenPorCajero() });
  const movimientos = useQuery({ queryKey: ["historial-inicio"], queryFn: () => obtenerHistorial() });

  const r = resumen.data;
  const datosGrafico = (serie.data ?? []).map((d) => ({
    dia: formatFecha(d.fecha).slice(0, 5),
    total: Number(d.total),
  }));

  return (
    <AppLayout titulo="Inicio">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi
          titulo="Recaudado hoy"
          valor={formatARS(r?.recaudado_hoy)}
          nota={`Semana ${formatARS(r?.recaudado_semana)}`}
          clase="bg-ink text-cream"
        />
        <Kpi
          titulo="Pendiente de retiro"
          valor={formatARS(r?.pendiente_retiro)}
          nota="En caja"
          clase="bg-sky text-ink"
        />
        <Kpi
          titulo="Retirado"
          valor={formatARS(r?.retirado_total)}
          nota="Camión recaudador"
          clase="bg-gold text-ink"
        />
        <Kpi
          titulo="Pend. acreditación"
          valor={formatARS(r?.pendiente_acreditacion)}
          nota="En tránsito"
          clase="bg-royal text-cream"
        />
        <Kpi
          titulo="Acreditado"
          valor={formatARS(r?.acreditado_total)}
          nota="Confirmado por la empresa"
          clase="bg-teal text-cream"
        />
        <Kpi
          titulo="Diferencias"
          valor={formatARS(r?.diferencias)}
          nota={Number(r?.diferencias ?? 0) < 0 ? "En contra del comercio" : "Sin diferencias en contra"}
          clase="bg-rose text-cream"
        />
        <Kpi
          titulo="Saldo"
          valor={formatARS(r?.saldo)}
          nota={Number(r?.saldo ?? 0) >= 0 ? "Saldo a favor / en caja" : "Saldo pendiente"}
          clase="bg-flame text-ink ring-1 ring-ink/10"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel
            titulo="Recaudación diaria"
            extra={<span className="label-xs text-muted-foreground">ARS · 14 días</span>}
          >
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tickFormatter={(v: number) => formatNumero(v / 1000) + "k"}
                  />
                  <Tooltip
                    formatter={(v: number) => formatARS(v)}
                    labelFormatter={(l: string) => `Día ${l}`}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
                  />
                  <Bar dataKey="total" fill="var(--royal)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-muted-foreground">
              <span>
                <b className="text-foreground">{formatARS(r?.recaudado_mes)}</b> en el mes
              </span>
              <span>
                <b className="text-foreground">{formatARS(r?.recaudado_total)}</b> acumulado
              </span>
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <Panel titulo="Flujo del dinero">
            <div className="space-y-3">
              <Barra titulo="Recaudado" valor={Number(r?.recaudado_total ?? 0)} max={Number(r?.recaudado_total ?? 0)} color="bg-flame" />
              <Barra titulo="Retirado" valor={Number(r?.retirado_total ?? 0)} max={Number(r?.recaudado_total ?? 0)} color="bg-gold" />
              <Barra titulo="Acreditado" valor={Number(r?.acreditado_total ?? 0)} max={Number(r?.recaudado_total ?? 0)} color="bg-teal" />
            </div>
            <div className="mt-4 rounded-xl bg-ink/5 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              Retirado {formatARS(r?.retirado_total)} vs acreditado {formatARS(r?.acreditado_total)} →
              diferencia <b className="text-rose">{formatARS(r?.diferencias)}</b>.
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel titulo="Por boca">
          <Tabla
            columnas={["Boca", "Operaciones", "Total"]}
            filas={(porBoca.data ?? []).map((b) => [b.codigo, String(b.operaciones), formatARS(b.total)])}
            vacio="Todavía no hay recaudaciones."
          />
        </Panel>
        <Panel titulo="Por cajero">
          <Tabla
            columnas={["Cajero", "Operaciones", "Total"]}
            filas={(porCajero.data ?? []).map((c) => [c.cajero, String(c.operaciones), formatARS(c.total)])}
            vacio="Todavía no hay recaudaciones."
          />
        </Panel>
      </div>

      <Panel titulo="Últimos movimientos">
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
              {(movimientos.data ?? []).slice(0, 10).map((m) => (
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
          {(movimientos.data ?? []).length === 0 && <EstadoVacio texto="Sin movimientos registrados." />}
        </div>
      </Panel>
    </AppLayout>
  );
}

function Barra({ titulo, valor, max, color }: { titulo: string; valor: number; max: number; color: string }) {
  const ancho = max > 0 ? Math.min(100, (valor / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="label-xs w-28 shrink-0">{titulo}</span>
      <div className="h-2.5 flex-1 rounded-full bg-ink/10">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${ancho}%` }} />
      </div>
      <span className="num w-32 text-right text-xs">{formatARS(valor)}</span>
    </div>
  );
}

function Tabla({
  columnas,
  filas,
  vacio,
}: {
  columnas: string[];
  filas: string[][];
  vacio: string;
}) {
  if (filas.length === 0) return <EstadoVacio texto={vacio} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="label-xs text-muted-foreground">
            {columnas.map((c, i) => (
              <th key={c} className={`px-3 py-2 font-normal ${i === 0 ? "text-left" : "text-right"}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.map((fila, idx) => (
            <tr key={idx} className="transition hover:bg-ink/5">
              {fila.map((celda, i) => (
                <td key={i} className={`px-3 py-2.5 ${i === 0 ? "" : "num text-right"}`}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
