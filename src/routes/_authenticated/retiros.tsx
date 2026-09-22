import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout, EstadoVacio, Panel, Tag } from "@/components/AppLayout";
import { Campo } from "./recaudaciones";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { etiquetaEstado, obtenerBocas, obtenerRetiros } from "@/lib/data";
import { formatARS, formatFecha, formatHora, hoyISO, parseImporte } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/retiros")({
  head: () => ({
    meta: [
      { title: "Retiros del camión — Rapipago Caja" },
      { name: "description", content: "Registro de los retiros del camión recaudador y su estado de acreditación." },
      { property: "og:title", content: "Retiros del camión — Rapipago Caja" },
      { property: "og:description", content: "Importe declarado, importe retirado y remito de cada retiro." },
    ],
  }),
  component: Retiros;
});

function Retiros() {
  return null;
}
