import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout, EstadoVacio, Panel } from "@/components/AppLayout";
import { Campo } from "./recaudaciones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { obtenerAjustes, obtenerBocas, obtenerResumen } from "@/lib/data";
import { formatARS, formatFecha, hoyISO, parseImporte } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/balance")({
  head: () => ({
    meta: [
      { title: "Balance — Rapipago Caja" },
      { name: "description", content: "Control permanente de saldos: recaudado, retirado, acreditado y diferencias." },
      { property: "og:title", content: "Balance — Rapipago Caja" },
      { property: "og:description", content: "Saldo a favor o pendiente, con ajustes registrados." },
    ],
  }),
  component: Balance,
});

function Balance() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const resumen = useQuery({ queryKey: ["resumen"], queryFn: obtenerResumen });
  const bocas = useQuery({ queryKey: ["bocas"], queryFn: obtenerBocas });
  const ajustes = useQuery({ queryKey: ["ajustes"], queryFn: obtenerAjustes });

  const [form, setForm] = useState({
    fecha: hoyISO(),
    bocaId: "",
    tipo: "POSITIVO" as "POSITIVO" | "NEGATIVO",
    importe: "",
    motivo: "",
  });

  const alta = useMutation({
    mutationFn: async () => {
      const importe = parseImporte(form.importe);
      if (!Number.isFinite(importe) || importe <= 0) throw new Error("El importe debe ser mayor a cero");
      if (!form.motivo.trim()) throw new Error("Indicá el motivo del ajuste");
      const { error } = await supabase.from("ajustes").insert({
        fecha: form.fecha,
        boca_id: form.bocaId || null,
        tipo: form.tipo,
        importe,
        motivo: form.motivo.trim(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Ajuste registrado en el historial");
      setForm({ ...form, importe: "", motivo: "" });
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const r = resumen.data;
  const saldo = Number(r?.saldo ?? 0);
  const diferencia = Number(r?.diferencias ?? 0);

  return (
    <AppLayout titulo="Balance">
      <Panel titulo="Control de saldos">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Dato titulo="Recaudado" valor={formatARS(r?.recaudado_total)} />
          <Dato titulo="Ajustes positivos" valor={formatARS(r?.ajustes_positivos)} />
          <Dato titulo="Ajustes negativos" valor={formatARS(r?.ajustes_negativos)} />
          <Dato titulo="Retirado" valor={formatARS(r?.retirado_total)} />
        </div>
        <div className="mt-4 rounded-xl bg-ink p-4 text-cream">
          <div className="label-xs text-cream/60">
            {saldo >= 0 ? "Saldo a favor / dinero en caja" : "Saldo pendiente"}
          </div>
          <div className="num mt-1 text-2xl font-bold">{formatARS(saldo)}</div>
          <p className="mt-2 font-mono text-[11px] text-cream/60">
            Recaudado + ajustes positivos − ajustes negativos − retirado. Calculado en la base de datos.
          </p>
        </div>
      </Panel>

      <Panel titulo="Retirado vs. acreditado">
        <div className="grid gap-3 sm:grid-cols-3">
          <Dato titulo="Retirado" valor={formatARS(r?.retirado_total)} />
          <Dato titulo="Acreditado" valor={formatARS(r?.acreditado_total)} />
          <Dato titulo="Pendiente de acreditación" valor={formatARS(r?.pendiente_acreditacion)} />
        </div>
        <div
          className={`mt-4 rounded-xl p-4 ${diferencia < 0 ? "bg-rose text-cream" : "bg-teal text-cream"}`}
        >
          <div className="label-xs opacity-75">
            {diferencia < 0 ? "Diferencia en contra del comercio" : "Diferencia a favor / sin faltantes"}
          </div>
          <div className="num mt-1 text-2xl font-bold">{formatARS(diferencia)}</div>
        </div>
      </Panel>

      {esAdmin && (
        <Panel titulo="Registrar ajuste">
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!window.confirm("¿Registrar este ajuste? Queda asentado en el historial y la auditoría.")) return;
              alta.mutate();
            }}
          >
            <Campo label="Fecha">
              <input type="date" className="field" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </Campo>
            <Campo label="Boca (opcional)">
              <select className="field" value={form.bocaId} onChange={(e) => setForm({ ...form, bocaId: e.target.value })}>
                <option value="">General</option>
                {(bocas.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.codigo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Tipo">
              <select
                className="field"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as "POSITIVO" | "NEGATIVO" })}
              >
                <option value="POSITIVO">Positivo (suma)</option>
                <option value="NEGATIVO">Negativo (resta)</option>
              </select>
            </Campo>
            <Campo label="Importe">
              <input className="field" inputMode="decimal" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} required />
            </Campo>
            <Campo label="Motivo">
              <input className="field" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} maxLength={200} required />
            </Campo>
            <div className="sm:col-span-2 lg:col-span-5">
              <button className="btn-primary" disabled={alta.isPending}>
                {alta.isPending ? "Registrando…" : "Registrar ajuste"}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel titulo="Ajustes registrados">
        {(ajustes.data ?? []).length === 0 ? (
          <EstadoVacio texto="No hay ajustes registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-normal">Fecha</th>
                  <th className="px-3 py-2 text-left font-normal">Boca</th>
                  <th className="px-3 py-2 text-left font-normal">Motivo</th>
                  <th className="px-3 py-2 text-right font-normal">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(ajustes.data ?? []).map((a) => (
                  <tr key={a.id} className="transition hover:bg-ink/5">
                    <td className="num px-3 py-2.5">{formatFecha(a.fecha)}</td>
                    <td className="px-3 py-2.5">{a.bocas?.codigo ?? "General"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{a.motivo}</td>
                    <td className={`num px-3 py-2.5 text-right ${a.tipo === "NEGATIVO" ? "text-rose" : "text-teal"}`}>
                      {a.tipo === "NEGATIVO" ? "-" : "+"}
                      {formatARS(a.importe)}
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

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-ink/5 p-3">
      <div className="label-xs text-muted-foreground">{titulo}</div>
      <div className="num mt-1 text-base font-bold">{valor}</div>
    </div>
  );
}
