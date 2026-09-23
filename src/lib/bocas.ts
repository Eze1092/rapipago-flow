import { supabase } from "@/integrations/supabase/client";

export const BOCAS_FIJAS = ["41159", "42278"] as const;

export async function asegurarBocasFijas() {
  const { error } = await supabase.from("bocas").upsert(
    BOCAS_FIJAS.map((codigo) => ({ codigo, nombre: `PUESTO ${codigo}`, activa: true })),
    { onConflict: "codigo", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}
