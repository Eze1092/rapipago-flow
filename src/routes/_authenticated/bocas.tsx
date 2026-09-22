import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { Campo } from "./recaudaciones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { obtenerBocas, obtenerResumenPorBoca } from "@/lib/data";
import { formatARS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bocas")({
  head: () => ({
    meta: [
      { title: "Bocas de cobro — Rapipago Caja" },
      { name: "description", content: "Alta, edición y baja de las bocas de cobro del comercio." },
      { property: "og:title", content: "Bocas de cobro — Rapipago Caja" },
      { property: "og:description", content: "Bocas 41159 y 42278 y su recaudación acumulada." },
    ],
  }),
  component: Bocas,
});

function Bocas() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const bocas = useQuery({ queryKey: ["bocas"], queryFn: obtenerBocas });
  const totales = useQuery({ queryKey: ["resumen-boca"], queryFn: () => obtenerResumenPorBoca() });
  const [form, setForm] = useState({ codigo: "", nombre: "" });

  const alta = useMutation({
    mutationFn: async () => {
      if (!form.codigo.trim()) throw new Error("Indicá el código de la boca");
      const { error } = await supabase
        .from("bocas")
        .insert({ codigo: form.codigo.trim(), nombre: form.nombre.trim() || form.codigo.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Boca agregada");
      setForm({ codigo: "", nombre: "" });
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, activa }: { id: string; activa: boolean }) => {
      const { error } = await supabase.from("bocas").update({ activa }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Boca actualizada");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalDe = (id: string) => totales.data?.find((t) => t.boca_id === id)?.total ?? 0;

  return (
    <AppLayout titulo="Bocas de cobro">
      {esAdmin && (
        <Panel titulo="Agregar boca">
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              alta.mutate();
            }}
          >
            <Campo label="Código">
              <input className="field" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} maxLength={20} required />
            </Campo>
            <Campo label="Nombre">
              <input className="field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={80} />
            </Campo>
            <div className="flex items-end">
              <button className="btn-primary" disabled={alta.isPending}>
                Agregar
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel titulo="Bocas registradas">
        {(bocas.data ?? []).length === 0 ? (
          <EstadoVacio texto="No hay bocas cargadas." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(bocas.data ?? []).map((b) => (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="num text-lg font-bold">{b.codigo}</div>
                    <div className="text-sm text-muted-foreground">{b.nombre}</div>
                  </div>
                  <Tag estado={b.activa ? "ACREDITADO" : "ANULADO"} texto={b.activa ? "Activa" : "Inactiva"} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="label-xs text-muted-foreground">Recaudado acumulado</div>
                    <div className="num font-bold">{formatARS(totalDe(b.id))}</div>
                  </div>
                  {esAdmin && (
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        if (window.confirm(b.activa ? "¿Desactivar esta boca?" : "¿Activar esta boca?"))
                          cambiarEstado.mutate({ id: b.id, activa: !b.activa });
                      }}
                    >
                      {b.activa ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}
