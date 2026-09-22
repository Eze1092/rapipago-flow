import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rapipago Caja — Control de recaudaciones" },
      {
        name: "description",
        content:
          "Ingresá al sistema de control de recaudaciones, retiros del camión y acreditaciones del Rapipago.",
      },
      { property: "og:title", content: "Rapipago Caja — Control de recaudaciones" },
      {
        property: "og:description",
        content: "Recaudaciones, retiros y acreditaciones del Rapipago en un solo panel.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, cargando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cargando) return;
    void navigate({ to: session ? "/inicio" : "/auth", replace: true });
  }, [session, cargando, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-flame font-display text-xl font-bold text-ink">
          R
        </div>
        <p className="label-xs mt-4 text-muted-foreground">Cargando Rapipago Caja…</p>
      </div>
    </div>
  );
}
