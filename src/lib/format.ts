const TZ = "America/Argentina/Buenos_Aires";

const ars = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $1.234.567,89 — el signo se antepone al símbolo para importes negativos. */
export function formatARS(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const sign = safe < 0 ? "-" : "";
  return `${sign}$${ars.format(Math.abs(safe))}`;
}

export function formatNumero(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return ars.format(Number.isFinite(n) ? n : 0);
}

/** "2026-09-21" -> "21/09/2026" */
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "-";
  const soloFecha = iso.slice(0, 10);
  const [y, m, d] = soloFecha.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatHora(hora: string | null | undefined): string {
  if (!hora) return "-";
  return hora.slice(0, 5);
}

export function formatFechaHora(timestamp: string | null | undefined): string {
  if (!timestamp) return "-";
  const fecha = new Date(timestamp);
  if (Number.isNaN(fecha.getTime())) return "-";
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
  return partes.replace(",", " ·");
}

/** Fecha de hoy en Argentina, en formato ISO (YYYY-MM-DD). */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function inicioDeMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function fechaLarga(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const texto = new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Convierte un texto ingresado por el usuario ("1.234.567,89") a número. */
export function parseImporte(texto: string): number {
  const limpio = texto.replace(/\s|\$/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : NaN;
}

export function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const contenido = filas
    .map((fila) =>
      fila
        .map((celda) => {
          const texto = String(celda ?? "");
          return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
        })
        .join(";"),
    )
    .join("\n");
  const blob = new Blob([`\ufeff${contenido}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
