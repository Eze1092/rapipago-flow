import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ingresar — Rapipago Caja" },
      {
        name: "description",
        content: "Acceso al sistema de control de recaudaciones del Rapipago para administradores y cajeros.",
      },
      { property: "og:title", content: "Ingresar — Rapipago Caja" },
      { property: "og:description", content: "Acceso para administradores y cajeros." },
    ],
  }),
  component: AuthPage,
});

const esquema = z.object({
  nombre: z.string().trim().max(80, "El nombre es demasiado largo").optional(),
  email: z.string().trim().email("Ingresá un email válido").max(255),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(72),
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/inicio", replace: true });
  }, [session, navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = esquema.safeParse({ nombre, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setEnviando(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password });
        if (error) throw error;
        toast.success("Sesión iniciada");
        void navigate({ to: "/inicio", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nombre: parsed.data.nombre || parsed.data.email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Cuenta creada");
          void navigate({ to: "/inicio", replace: true });
        } else {
          toast.success("Cuenta creada. Revisá tu email para confirmarla.");
          setModo("login");
        }
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo completar la operación";
      toast.error(
        mensaje.includes("Invalid login credentials") ? "Email o contraseña incorrectos" : mensaje,
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden flex-1 flex-col justify-between bg-ink p-10 text-cream lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-flame font-display text-lg font-bold text-ink">
            R
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Rapipago Caja</span>
        </div>
        <div>
          <h1 className="max-w-md font-display text-4xl font-bold leading-tight">
            Control de recaudaciones, retiros y acreditaciones.
          </h1>
          <p className="mt-4 max-w-md text-sm text-cream/70">
            Todos los cajeros y administradores trabajan sobre la misma base de datos, con
            auditoría completa de cada movimiento.
          </p>
        </div>
        <div className="label-xs text-cream/50">Bocas 41159 · 42278 · Pesos argentinos (ARS)</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={enviar} className="surface w-full max-w-sm p-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-flame font-display text-lg font-bold text-ink">
              R
            </span>
            <span className="font-display text-xl font-bold tracking-tight">Rapipago Caja</span>
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold lg:mt-0">
            {modo === "login" ? "Ingresar" : "Crear cuenta"}
          </h2>
          <p className="label-xs mt-1 text-muted-foreground">
            {modo === "login" ? "Usuarios habilitados del comercio" : "El primer usuario será administrador"}
          </p>

          <div className="mt-5 space-y-3">
            {modo === "registro" && (
              <div>
                <label className="label-xs text-muted-foreground" htmlFor="nombre">
                  Nombre y apellido
                </label>
                <input
                  id="nombre"
                  className="field mt-1"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={80}
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="label-xs text-muted-foreground" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="field mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label-xs text-muted-foreground" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="field mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={72}
                autoComplete={modo === "login" ? "current-password" : "new-password"}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary mt-5 w-full" disabled={enviando}>
            {enviando ? "Procesando…" : modo === "login" ? "Ingresar" : "Crear cuenta"}
          </button>

          <button
            type="button"
            className="mt-3 w-full text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setModo(modo === "login" ? "registro" : "login")}
          >
            {modo === "login" ? "No tengo cuenta · Registrarme" : "Ya tengo cuenta · Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
