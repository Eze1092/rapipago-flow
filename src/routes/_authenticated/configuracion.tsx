import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, Panel } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Rapipago Caja" },
      { name: "description", content: "Datos de la cuenta, instalación de la aplicación y reglas del sistema." },
      { property: "og:title", content: "Configuración — Rapipago Caja" },
      { property: "og:description", content: "Cuenta, instalación y reglas de uso." },
    ],
  }),
  component: Configuracion,
});

function Configuracion() {
  const { perfil, rol, cerrarSesion } = useAuth();

  return (
    <AppLayout titulo="Configuración">
      <Panel titulo="Tu cuenta">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="label-xs text-muted-foreground">Nombre</dt>
            <dd className="mt-1 text-sm">{perfil?.nombre ?? "-"}</dd>
          </div>
          <div>
            <dt className="label-xs text-muted-foreground">Correo</dt>
            <dd className="mt-1 text-sm">{perfil?.email ?? "-"}</dd>
          </div>
          <div>
            <dt className="label-xs text-muted-foreground">Rol</dt>
            <dd className="mt-1 text-sm">{rol === "ADMIN" ? "Administrador" : "Cajero"}</dd>
          </div>
        </dl>
        <button className="btn-ghost mt-4" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </button>
      </Panel>

      <Panel titulo="Instalar la aplicación">
        <ul className="space-y-2 text-sm leading-relaxed">
          <li>
            <b>Windows (Edge):</b> abrí el menú de tres puntos → Aplicaciones → Instalar este sitio como una aplicación.
          </li>
          <li>
            <b>Android (Chrome):</b> menú de tres puntos → Agregar a pantalla principal.
          </li>
          <li>
            <b>iPhone (Safari):</b> botón Compartir → Agregar a pantalla de inicio.
          </li>
        </ul>
      </Panel>

      <Panel titulo="Reglas del sistema">
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Los importes se muestran en pesos con el formato $1.234.567,89 y las fechas como DD/MM/AAAA.</li>
          <li>Ningún registro financiero se borra: las correcciones se hacen anulando o con ajustes, y todo queda en el historial.</li>
          <li>Cada operación guarda automáticamente quién la hizo y en qué momento.</li>
          <li>Los totales y saldos se calculan siempre en la base de datos, nunca solo en la pantalla.</li>
          <li>Las bocas se administran desde la sección Bocas; los cajeros solo ven y cargan sus propias operaciones.</li>
        </ul>
      </Panel>
    </AppLayout>
  );
}
