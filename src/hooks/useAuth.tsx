import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Rol = "ADMIN" | "CAJERO";

type Perfil = { id: string; nombre: string; email: string; activo: boolean };

type AuthValue = {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  rol: Rol | null;
  esAdmin: boolean;
  cargando: boolean;
  refrescar: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  perfil: null,
  rol: null,
  esAdmin: false,
  cargando: true,
  refrescar: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargarDatos(userId: string | undefined) {
    if (!userId) {
      setPerfil(null);
      setRol(null);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, nombre, email, activo").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setPerfil((p as Perfil | null) ?? null);
    const roles = (r ?? []).map((x) => x.role as Rol);
    setRol(roles.includes("ADMIN") ? "ADMIN" : (roles[0] ?? "CAJERO"));
  }

  useEffect(() => {
    let activo = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      if (!activo) return;
      setSession(nuevaSesion);
      void cargarDatos(nuevaSesion?.user.id).then(() => activo && setCargando(false));
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setSession(data.session);
      void cargarDatos(data.session?.user.id).then(() => activo && setCargando(false));
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      perfil,
      rol,
      esAdmin: rol === "ADMIN",
      cargando,
      refrescar: () => cargarDatos(session?.user.id),
    }),
    [session, perfil, rol, cargando],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
