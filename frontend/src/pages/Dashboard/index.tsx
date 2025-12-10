import { useEffect, useMemo, useState, useRef } from "react";
import type { ReactNode } from "react";
import { toast } from 'react-hot-toast';
import {
  api,
  fetchEventos,
  fetchLeads,
  type Evento as EventoApi,
  type Propiedad as PropiedadApi,
  type Contacto as ContactoApi,
} from "../../lib/api";

/* ============================== Types ============================== */
type Contacto = ContactoApi;
type Propiedad = PropiedadApi;
type Evento = EventoApi;

type Filters = { date?: string; from?: string; to?: string; types?: string };

type DashboardData = {
  total_contactos: number;
  contactos_por_estado: { fase: string; total: number }[];
  proximos_contactos: number;
  atrasados: number;
  ultimos_contactos: { id: number; nombre: string; apellido: string; email: string }[];
  avisos_pendientes: number;
  avisos_atrasados: number;
};

/** ModalShell
 * - Separa BACKDROP del CONTENIDO.
 * - Resuelve z-index y stacking contexts para que el fondo no "lave" el modal.
 * - Cierra al click fuera y con Escape.
 */
function ModalShell({
  title,
  children,
  maxWidth = "max-w-3xl",
  onClose,
}: {
  title?: string;
  children: ReactNode;
  maxWidth?: "max-w-sm" | "max-w-lg" | "max-w-3xl" | "max-w-4xl";
  onClose: () => void;
}) {
  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Bloquear scroll del fondo
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />

      {/* Contenedor Modal */}
      <div
        className={`relative w-full ${maxWidth} bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow decorativo */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600"></div>

        {title && (
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ============================ Utilities ============================ */
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fromISO = (s: string) => new Date(s);
const sortByDateAsc = (a: Evento, b: Evento) =>
  +fromISO(a.fecha_hora) - +fromISO(b.fecha_hora);

const formatHour = (d: string | Date) =>
  (typeof d === "string" ? new Date(d) : d).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (d: Date, opts: Intl.DateTimeFormatOptions = {}) =>
  d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", ...opts });

const toLocalInputValue = (d?: string | Date | null) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

const plural = (n: number, uno: string, muchos: string) =>
  n === 1 ? uno : muchos;

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function monthRange(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { from: ymd(start), to: ymd(end) };
}

/* =============== Validación de solapamientos =============== */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;
function parseFechaHoraRange(ev: Partial<Evento>, durationMs = DEFAULT_DURATION_MS): { start: Date; end: Date } | null {
  if (!ev || !ev.fecha_hora) return null;
  const d = new Date(ev.fecha_hora);
  if (isNaN(d.getTime())) return null;
  return { start: d, end: new Date(d.getTime() + durationMs) };
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function validateEventoNoSolapa(
  newEv: Partial<Evento>,
  existing: Evento[],
  opts?: { ignoreId?: number; durationMs?: number }
): { ok: true } | { ok: false; msg: string } {
  const dur = opts?.durationMs ?? DEFAULT_DURATION_MS;
  const newRange = parseFechaHoraRange(newEv, dur);
  if (!newRange) return { ok: false, msg: "Fecha/hora inválida." };

  const newProp = (newEv as any).propiedad ?? (newEv as any).propiedad_id ?? null;

  for (const ev of existing) {
    if (opts?.ignoreId && ev.id === opts.ignoreId) continue;
    const evRange = parseFechaHoraRange(ev as Partial<Evento>, dur);
    if (!evRange) continue;

    const evProp = (ev as any).propiedad ?? (ev as any).propiedad_id ?? null;

    if (newProp === evProp) {
      if (newRange.start.getTime() === evRange.start.getTime()) {
        return {
          ok: false,
          msg: "Ya existe un evento exactamente en esa fecha y hora para la misma propiedad.",
        };
      }
      if (rangesOverlap(newRange.start, newRange.end, evRange.start, evRange.end)) {
        return {
          ok: false,
          msg: `El horario solapa con otro evento en la misma propiedad.`,
        };
      }
    }
  }

  return { ok: true };
}

/* ============================== Page =============================== */
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [today] = useState(new Date());
  const [cursor, setCursor] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activeFilters, setActiveFilters] = useState<Filters | null>(null);

  // UI/Modals
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [openEventModal, setOpenEventModal] = useState<{
    mode: "create" | "edit";
    baseDate?: Date;
    evento?: Evento;
  } | null>(null);
  const [openDayModal, setOpenDayModal] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState<Evento | null>(null);

  /* ------------------------ Fetch data ------------------------ */
  async function fetchStatic() {
    if (!localStorage.getItem('rc_token')) {
      setLoading(false);
      toast.error("No autenticado. Por favor, inicia sesión.");
      return;
    }

    try {
      const [cRes, pRes, dRes] = await Promise.all([
        api.get("contactos/"),
        api.get("propiedades/"),
        api.get("dashboard/data/"),
      ]);
      const toArr = (d: any) => Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : [];
      setContactos(toArr(cRes.data));
      setPropiedades(toArr(pRes.data));
      setDashboardData(dRes.data);
    } catch (e: any) {
      console.error(e);
      setContactos([]); setPropiedades([]);
      if (e.response && e.response.status !== 401) {
        toast.error("No se pudieron cargar datos iniciales.");
      }
    }
  }

  async function fetchMonthEvents(d = cursor) {
    if (!localStorage.getItem('rc_token')) return;
    const { from, to } = monthRange(d);
    try {
      const data = await fetchEventos({ from, to, ordering: "fecha_hora" });
      setEventos(Array.isArray(data) ? data : data?.results ?? []);
    } catch (e) {
      console.error("Error fetching month events:", e);
    }
  }

  async function fetchWithFilters(filters: Filters) {
    if (!localStorage.getItem('rc_token')) return;
    try {
      const data = await fetchEventos({ ...filters, ordering: "fecha_hora" });
      setEventos(Array.isArray(data) ? data : data?.results ?? []);
    } catch (e) {
      console.error("Error fetching filtered events:", e);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchStatic().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!localStorage.getItem('rc_token')) {
        if (mounted) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (activeFilters) await fetchWithFilters(activeFilters);
        else await fetchMonthEvents(cursor); // Pass cursor explicitly as it's a dependency
      } catch (e: any) {
        console.error(e);
        setEventos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [cursor, activeFilters]);

  // The previous useEffect block already handles fetching based on cursor and activeFilters.
  // This useEffect block was incomplete and redundant, so it has been removed.
  // If a separate refresh mechanism is intended, it should be implemented explicitly.
}