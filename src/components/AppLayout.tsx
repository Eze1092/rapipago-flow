import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fechaLarga, hoyISO } from "@/lib/format";

const MENU = [
  { to: "/inicio", label: "Inicio" },
  { to: "/recaudaciones", label: "Recaudaciones" },
  { to: "/cajeros_atm", label: "Cajero Automático" },
  { to: "/cierres", label: "Cierres" },
  { to: "/retiros", label: "Retiros" },
  { to: "/acreditaciones", label: "Acreditaciones" },
  { to: "/balance", label: "Balance" },
  { to: "/reportes", label: "Reportes" },
  { to: "/bocas", label: "Bocas" },
  { to: "/historial", label: "Historial" },
  { to: "/configuracion", label: "Configuración" },
] as const;

export function AppLayout({
  titulo,
  acciones,
  children,
}: {
  titulo: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  const { perfil, rol } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ruta = useRouterState({ select: (s) => s.location.pathname });
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const iniciales = (perfil?.nombre || perfil?.email || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const nav = (
    <nav className="flex flex-col gap-0.5 text-sm">
      {MENU.map((item) => {
        const activo = ruta === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={
              activo
                ? "rounded-xl bg-cream px-3 py-2 font-medium text-ink"
                : "rounded-xl px-3 py-2 font-medium text-cream/70 transition hover:bg-cream/10"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background font-body text-foreground antialiased">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-ink p-5 text-cream lg:flex">
          <Marca />
          <div className="label-xs mb-6 mt-3 text-cream/50">Gestión de caja</div>
          {nav}
          <div className="mt-auto rounded-xl border border-cream/15 p-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-gold font-display font-bold text-ink">
                {iniciales}
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{perfil?.nombre || "Usuario"}</div>
                <div className="label-xs text-cream/60">{rol ?? "—"}</div>
              </div>
            </div>
            <button
              onClick={cerrarSesion}
              className="mt-3 w-full rounded-lg border border-cream/20 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cream/70 transition hover:bg-cream/10"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {abierto && (
          <div className="fixed inset-0 z-30 flex lg:hidden">
            <div className="absolute inset-0 bg-ink/50" onClick={() => setAbierto(false)} />
            <aside className="relative z-40 flex w-64 flex-col bg-ink p-5 text-cream">
              <div className="flex items-center justify-between">
                <Marca />
                <button onClick={() => setAbierto(false)} aria-label="Cerrar menú">
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-6">{nav}</div>
              <button
                onClick={cerrarSesion}
                className="mt-auto rounded-lg border border-cream/20 py-2 font-mono text-[10px] uppercase tracking-widest text-cream/70"
              >
                Cerrar sesión
              </button>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-sm sm:px-5">
            <button
              className="lg:hidden"
              onClick={() => setAbierto(true)}
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold leading-none tracking-tight sm:text-2xl">
                {titulo}
              </h1>
              <div className="label-xs mt-1 text-muted-foreground">{fechaLarga(hoyISO())}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">{acciones}</div>
          </header>
          <div className="space-y-5 p-4 sm:p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-flame font-display text-lg font-bold text-ink">
        R
      </span>
      <span className="font-display text-xl font-bold tracking-tight">Rapipago</span>
    </div>
  );
}

export function Tag({ estado, texto }: { estado: string; texto: string }) {
  const clases: Record<string, string> = {
    RECAUDADO: "border-royal/40 bg-royal/10 text-royal",
    RETIRADO: "border-gold/50 bg-gold/15 text-gold",
    ANULADO: "border-rose/40 bg-rose/10 text-rose",
    PENDIENTE_ACREDITACION: "border-royal/40 bg-royal/10 text-royal",
    ACREDITADO: "border-teal/40 bg-teal/10 text-teal",
    CERRADO: "border-teal/40 bg-teal/10 text-teal",
    POSITIVO: "border-teal/40 bg-teal/10 text-teal",
    NEGATIVO: "border-rose/40 bg-rose/10 text-rose",
  };
  return <span className={`tag ${clases[estado] ?? "border-border bg-muted text-muted-foreground"}`}>{texto}</span>;
}

export function Panel({
  titulo,
  extra,
  children,
}: {
  titulo: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="surface rise p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold tracking-tight">{titulo}</h2>
        {extra}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EstadoVacio({ texto }: { texto: string }) {
  return <p className="py-8 text-center font-mono text-xs text-muted-foreground">{texto}</p>;
}
