import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { obtenerResumenPorCajero, obtenerUsuarios } from "@/lib/data";
import { formatARS } from "@/lib/format";

export const Route = { component: CajeroAtmComponent };
  head: () => ({
    meta: [
      { title: "Cajeros — Rapipago Caja" },
      { name: "description", content: "Usuarios del sistema, su rol y la recaudación de cada cajero." },
      { property: "og:title", content: "Cajeros — Rapipago Caja" },
      { property: "og:description", content: "Administradores y cajeros habilitados." },
    ],
  }),
  component: Cajeros,
});

function Cajeros() {
  const usuarios = useQuery({ queryKey: ["usuarios"], queryFn: obtenerUsuarios });
  const porCajero = useQuery({ queryKey: ["resumen-cajero"], queryFn: () => obtenerResumenPorCajero() });

  return (
    <AppLayout titulo="Cajeros">
      <Panel titulo="Usuarios del sistema">
        {(usuarios.data ?? []).length === 0 ? (
          <EstadoVacio texto="No hay usuarios cargados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-normal">Nombre</th>
                  <th className="px-3 py-2 text-left font-normal">Correo</th>
                  <th className="px-3 py-2 text-left font-normal">Rol</th>
                  <th className="px-3 py-2 text-right font-normal">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(usuarios.data ?? []).map((u) => (
                  <tr key={u.id} className="transition hover:bg-ink/5">
                    <td className="px-3 py-2.5">{u.nombre}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{u.email}</td>
                    <td className="px-3 py-2.5">{u.rol === "ADMIN" ? "Administrador" : "Cajero"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Tag estado={u.activo ? "ACREDITADO" : "ANULADO"} texto={u.activo ? "Activo" : "Inactivo"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel titulo="Recaudación por cajero">
        {(porCajero.data ?? []).length === 0 ? (
          <EstadoVacio texto="Todavía no hay recaudaciones registradas." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(porCajero.data ?? []).map((c) => (
              <div key={c.cajero} className="rounded-2xl border border-border bg-card p-4">
                <div className="label-xs text-muted-foreground">{c.cajero}</div>
                <div className="num mt-1 text-lg font-bold">{formatARS(c.total)}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{c.operaciones} operaciones</div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppLayout>
  );
}
