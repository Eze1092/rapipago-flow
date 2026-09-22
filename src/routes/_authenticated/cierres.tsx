import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { Campo } from "./recaudaciones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { obtenerCierres } from "@/lib/data";
import { formatARS, formatFecha, hoyISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cierres")({
  head: () => ({
    meta: [
      { title: "Cierres diarios — Rapipago Caja" },
      { name: "description", content: "Cierre de la jornada con totales por boca, por cajero y cantidad de operaciones." },
      { property: "og:title", content: "Cierres diarios — Rapipago Caja" },
      { property: "og:description", content: "Jornadas cerradas y su detalle." },
    ],
  }),
  component: Cierres,
});

function Cierres() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ["cierres"], queryFn: obtenerCierres });
  const [fecha, setFecha] = useState(hoyISO());
  const [observaciones, setObservaciones] = useState("");

  const cerrar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("cerrar_jornada", { _fecha: fecha, _observaciones: observaciones });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Jornada cerrada");
      setObservaciones("");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filas = lista.data ?? [];

  return (
    <AppLayout titulo="Cierres">
      {esAdmin && (
        <Panel titulo="Cerrar jornada">
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!window.confirm(`¿Cerrar la jornada del ${formatFecha(fecha)}? Después solo podrá corregirse con un ajuste.`)) return;
              cerrar.mutate();
            }}
          >
            <Campo label="Fecha de la jornada">
              <input type="date" className="field" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </Campo>
            <Campo label="Observaciones">
              <input className="field" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={200} />
            </Campo>
            <div className="flex items-end">
              <button className="btn-primary" disabled={cerrar.isPending}>
                {cerrar.isPending ? "Cerrando…" : "Cerrar jornada"}
              </button>
            </div>
          </form>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            Una vez cerrada, la jornada no se modifica: las correcciones se registran como ajustes en el balance.
          </p>
        </Panel>
      )}

      {filas.length === 0 && (
        <Panel titulo="Jornadas cerradas">
          <EstadoVacio texto="Todavía no se cerró ninguna jornada." />
        </Panel>
      )}

      {filas.map((c) => (
        <Panel
          key={c.id}
          titulo={`Jornada ${formatFecha(c.fecha)}`}
          extra={<Tag estado={c.estado} texto={c.estado === "CERRADO" ? "Cerrado" : "Anulado"} />}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-ink/5 p-3">
              <div className="label-xs text-muted-foreground">Total general</div>
              <div className="num mt-1 text-lg font-bold">{formatARS(c.total)}</div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                {c.cantidad_operaciones} operaciones
              </div>
              {Number(c.detalle?.ajustes ?? 0) !== 0 && (
                <div className="mt-1 font-mono text-[11px] text-rose">
                  Ajustes: {formatARS(c.detalle?.ajustes ?? 0)}
                </div>
              )}
            </div>
            <div>
              <div className="label-xs text-muted-foreground">Por boca</div>
              <ul className="mt-2 space-y-1 text-sm">
                {(c.detalle?.por_boca ?? []).map((b) => (
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
                {(c.detalle?.por_cajero ?? []).map((x) => (
                  <li key={x.cajero} className="flex justify-between">
                    <span>{x.cajero}</span>
                    <span className="num">{formatARS(x.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {c.observaciones && (
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">{c.observaciones}</p>
          )}
        </Panel>
      ))}
    </AppLayout>
  );
}
