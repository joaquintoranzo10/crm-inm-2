import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { CalendarPlus,BarChart3,Bell } from "lucide-react";
import { toast } from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import {
  api,
  fetchEventos,
  fetchLeads,
  type Evento as EventoApi,
  type Propiedad as PropiedadApi,
  type Contacto as ContactoApi,
} from "../../lib/api";


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


const DEFAULT_DURATION_MS = 30 * 60 * 1000;
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

  for (const ev of existing) {
    if (opts?.ignoreId && ev.id === opts.ignoreId) continue;
    const evRange = parseFechaHoraRange(ev as Partial<Evento>, dur);
    if (!evRange) continue;

    if (newRange.start.getTime() === evRange.start.getTime()) {
      return {
        ok: false,
        msg: "Ya tenés un evento agendado exactamente en esa fecha y hora.",
      };
    }
    if (rangesOverlap(newRange.start, newRange.end, evRange.start, evRange.end)) {
      return {
        ok: false,
        msg: "El horario se solapa con otro evento agendado en tu agenda.",
      };
    }
  }

  return { ok: true };
}


export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [today] = useState(new Date());
  const [cursor, setCursor] = useState(new Date()); 
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activeFilters, setActiveFilters] = useState<Filters | null>(null);

  
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [openEventModal, setOpenEventModal] = useState<{
    mode: "create" | "edit";
    baseDate?: Date;
    evento?: Evento;
  } | null>(null);
  const [openDayModal, setOpenDayModal] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState<Evento | null>(null);
  const [openAvisoModal, setOpenAvisoModal] = useState(false);

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
        else await fetchMonthEvents();
      } catch (e: any) {
        console.error(e);
        setEventos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [cursor, activeFilters]);

  useEffect(() => {
    const handler = () => {
      if (!localStorage.getItem('rc_token')) return;
      if (activeFilters) fetchWithFilters(activeFilters);
      else fetchMonthEvents();
      fetchStatic();
    };
    window.addEventListener("calendar:refresh", handler as EventListener);
    return () => window.removeEventListener("calendar:refresh", handler as EventListener);
  }, [activeFilters, cursor]);


  const monthLabel = `${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`;

  const monthGrid = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDay = (start.getDay() + 6) % 7;
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - startDay);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return { days };
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Evento[]>();
    for (const ev of eventos) {
      const d = new Date(ev.fecha_hora);
      const key = toKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    for (const list of map.values()) list.sort(sortByDateAsc);
    return map;
  }, [eventos]);

  const summaryByDay = useMemo(() => {
    const m = new Map<string, { r: number; l: number; v: number; total: number }>();
    for (const [k, list] of eventsByDay.entries()) {
      let r = 0, l = 0, v = 0;
      for (const ev of list) {
        if (ev.tipo === "Reunion") r++;
        else if (ev.tipo === "Llamada") l++;
        else if (ev.tipo === "Visita") v++;
      }
      m.set(k, { r, l, v, total: list.length });
    }
    return m;
  }, [eventsByDay]);



  const kpis = useMemo(() => {
    const totalLeads = contactos.length;
    const norm = (s?: string | null) => (s || "").trim().toLowerCase();
    const isVendida = (p: Propiedad) => norm(p.estado).includes("vendid");

    let enVenta = 0, enAlquiler = 0, vendidas = 0;
    for (const p of propiedades) {
      if (isVendida(p)) { vendidas++; continue; }
      const d = norm(p.disponibilidad);
      if (d === "venta") enVenta++;
      else if (d === "alquiler") enAlquiler++;
    }

    const evInMonth = eventos.length;

    return [
      { label: "Leads", value: totalLeads, hint: "" },
      { label: "Propiedades en venta", value: enVenta, hint: "" },
      { label: "Propiedades en alquiler", value: enAlquiler, hint: "" },
      { label: "Propiedades vendidas", value: vendidas, hint: "" },
      { label: "Reuniones programadas", value: evInMonth, hint: "" },
    ];
  }, [contactos, propiedades, eventos]);


  const prevMonth = () => { const d = new Date(cursor); d.setMonth(cursor.getMonth() - 1); setCursor(d); };
  const nextMonth = () => { const d = new Date(cursor); d.setMonth(cursor.getMonth() + 1); setCursor(d); };

  function openCreateOnDay(d: Date) { setOpenEventModal({ mode: "create", baseDate: d }); }

  async function saveEvento(data: Partial<Evento>, mode: "create" | "edit", id?: number) {
    if (!localStorage.getItem('rc_token')) {
      toast.error("Acción no permitida. Inicia sesión.");
      return;
    }

    const payload: any = {};
    (["nombre", "apellido", "email", "tipo", "fecha_hora", "notas", "propiedad", "contacto"] as const)
      .forEach((k) => { 
        const v = (data as any)[k]; 
        if (v !== undefined) payload[k] = v; 
      });

    
    if (!payload.contacto) payload.contacto = null;
    if (!payload.email || payload.email.trim() === "") {
      payload.email = null;
    }
    if (!payload.nombre) payload.nombre = "";
    if (!payload.apellido) payload.apellido = "";
    if (!payload.notas) payload.notas = "";

    const ignoreId = mode === "edit" ? id : undefined;
    const valid = validateEventoNoSolapa(payload, eventos, { ignoreId });
    if (!valid.ok) {
      toast.error(valid.msg);
      return;
    }

    try {
      let fechaISO = String(payload.fecha_hora);
      if (fechaISO.length <= 16 && fechaISO.includes("T")) {
        const d = new Date(fechaISO);
        fechaISO = d.toISOString();
      }
      payload.fecha_hora = fechaISO;

      if (mode === "create") await api.post("eventos/", payload);
      else if (id) await api.patch(`eventos/${id}/`, payload);

      if (activeFilters) await fetchWithFilters(activeFilters);
      else await fetchMonthEvents();

      await fetchStatic();

      setOpenEventModal(null);
      setOpenDayModal(null);
      toast.success("Evento guardado correctamente.");
    } catch (e: any) {
      console.error("Error al guardar evento:", e?.response?.data || e);
      const serverMsg = e?.response?.data?.non_field_errors?.[0] || e?.response?.data?.detail || JSON.stringify(e?.response?.data) || "No se pudo guardar el evento.";
      toast.error(serverMsg);
    }
  }

  async function deleteEvento(ev: Evento) {
    if (!localStorage.getItem('rc_token')) {
      toast.error("Acción no permitida. Inicia sesión.");
      return;
    }

    try {
      await api.delete(`eventos/${ev.id}/`);
      if (activeFilters) await fetchWithFilters(activeFilters);
      else await fetchMonthEvents();
      await fetchStatic();

      setDeleting(null);
      toast.success("Evento eliminado.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar el evento.");
    }
  }

  
 return (
    <div className="relative w-full h-full">
      
      <div className="flex flex-col gap-5 sm:gap-8 max-w-[1600px] mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-base-clr text-center md:text-left">
            Bienvenido a Real Connect
          </h2>

          <button
            className="h-11 sm:h-10 px-4 rounded-lg text-sm font-bold transition-all border border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white shadow-sm flex items-center justify-center gap-2"
            onClick={() => setOpenAvisoModal(true)}
          >
            <Bell className="w-5 h-5" />
            <span>Recordatorio</span>
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-end gap-2.5 sm:gap-3">
            <button
              className="h-11 sm:h-10 px-4 rounded-lg text-sm font-bold transition-all border border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white shadow-sm flex items-center justify-center gap-2"
              onClick={() => navigate("/app/metricas")}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Ver métricas</span>
            </button>

            <button
              className="h-11 sm:h-10 px-4 rounded-lg text-sm font-bold transition-all border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white shadow-sm flex items-center justify-center gap-2"
              onClick={() => setOpenEventModal({ mode: "create", baseDate: new Date() })}
            >
              <CalendarPlus className="w-5 h-5" />
              <span>Agregar evento</span>
            </button>
            
            {/* Controles navegación*/}
            <div className="flex items-center justify-center gap-2 bg-surface border border-soft rounded-xl p-1 shadow-sm">
              <button 
                onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-clr hover:bg-surface-2 hover:text-base-clr transition-colors"
              >
                ←
              </button>

              <div className="flex-1 sm:flex-none min-w-[120px] sm:min-w-[140px] text-center font-bold text-sm text-base-clr px-2 uppercase tracking-wide">
                {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              </div>

              <button 
                onClick={nextMonth} 
                className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-clr hover:bg-surface-2 hover:text-base-clr transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {kpis.map((k) => (
            <div
              key={k.label}
             
              className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-surface p-3 sm:p-5 transition-all duration-300 ease-in-out
                         shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
                         hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)]
                         border-t border-white/40 dark:border-white/5"
            >
            
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative flex flex-col justify-between h-full min-h-[64px] sm:min-h-[100px]">
                <div>
                    <span className="text-[11px] sm:text-sm font-medium text-muted-clr uppercase tracking-wider block mb-1 leading-tight">
                    {k.label}
                    </span>
                </div>
                <div className="text-2xl sm:text-4xl font-bold text-base-clr tracking-tight">
                  {k.value}
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            </div>
          ))}
        </div>

        {/* CALENDARIO */}
        <div className="w-full">
          <div className="rounded-2xl border border-soft bg-surface shadow-lg overflow-hidden">
            <div className="w-full">
              <div className="grid grid-cols-7 border-b border-soft text-[10px] md:text-xs font-semibold text-muted-clr uppercase tracking-wider bg-surface-2">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="px-1 md:px-4 py-2 md:py-3 text-center truncate">{w}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 auto-rows-[minmax(5rem,auto)] md:auto-rows-[minmax(8rem,auto)]">
                {monthGrid.days.map((d, i) => {
                  const inMonth = d.getMonth() === cursor.getMonth();
                  const key = toKey(d);
                  const isToday = sameDay(d, today);
                  const allEvents = inMonth ? (eventsByDay.get(key) || []) : [];
                  const sum = summaryByDay.get(key) || { r: 0, l: 0, v: 0, total: 0 };

                  const dd = String(d.getDate()).padStart(2, "0");

                  return (
                    <div
                      key={i}
                      className={`border-r border-b border-soft p-1 sm:p-2 md:p-3 flex flex-col transition-colors group ${
                          inMonth ? "bg-transparent hover:bg-surface-2" : "bg-surface-2/30 opacity-50"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row items-center justify-between shrink-0 mb-1 md:mb-2 gap-1">
                        <div className={`text-xs md:text-sm font-medium ${inMonth ? "text-base-clr" : "text-muted-clr"}`}>
                          {dd}
                        </div>
                        {inMonth && isToday && (
                          <span className="text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full bg-blue-600 text-white">
                            HOY
                          </span>
                        )}
                      </div>

                      {inMonth && sum.total > 0 && (
                        <button
                          className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded p-1 md:p-2 transition-all active:scale-95"
                          onClick={() => setOpenDayModal(d)}
                        >
                            <div className="flex flex-col xl:flex-row flex-wrap gap-1 md:gap-1.5 justify-center xl:justify-start">
                                {sum.r > 0 && <span className="text-[9px] md:text-[10px] px-1 md:px-1.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-center" title="Reuniones"><span className="xl:hidden">R:</span>{sum.r} <span className="hidden xl:inline">Reun.</span></span>}
                                {sum.l > 0 && <span className="text-[9px] md:text-[10px] px-1 md:px-1.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-center" title="Llamadas"><span className="xl:hidden">L:</span>{sum.l} <span className="hidden xl:inline">Llam.</span></span>}
                                {sum.v > 0 && <span className="text-[9px] md:text-[10px] px-1 md:px-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-center" title="Visitas"><span className="xl:hidden">V:</span>{sum.v} <span className="hidden xl:inline">Visit.</span></span>}
                            </div>
                        </button>
                      )}

                      <div className="flex-1" />
                      {inMonth && (
                        <div className="hidden lg:flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                          <button
                            className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/70 dark:hover:text-white transition-colors"
                            onClick={() => openCreateOnDay(d)}
                            title="Nuevo evento"
                          >
                            +
                          </button>
                          {allEvents.length > 0 && (
                             <button
                             className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/70 dark:hover:text-white transition-colors"
                             onClick={() => setOpenDayModal(d)}
                             title="Ver detalles"
                           >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                           </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      
      {openDayModal && (
        <DayEventsModal
          date={openDayModal}
          eventos={(eventsByDay.get(toKey(openDayModal)) || []).slice().sort(sortByDateAsc)}
          resumen={summaryByDay.get(toKey(openDayModal)) || { r: 0, l: 0, v: 0, total: 0 }}
          onClose={() => setOpenDayModal(null)}
          onEdit={(ev) => setOpenEventModal({ mode: "edit", evento: ev })}
          onDelete={(ev) => setDeleting(ev)}
          onCreate={() => setOpenEventModal({ mode: "create", baseDate: openDayModal })}
        />
      )}

      {openEventModal && (
        <EventModal
          mode={openEventModal.mode}
          baseDate={openEventModal.baseDate}
          evento={openEventModal.evento}
          contactos={contactos}
          propiedades={propiedades}
          onCancel={() => setOpenEventModal(null)}
          onSave={saveEvento}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Eliminar evento"
          message={`¿Seguro que querés eliminar el evento de ${formatHour(deleting.fecha_hora)} (${deleting.tipo})?`}
          confirmLabel="Eliminar"
          confirmType="danger"
          onCancel={() => setDeleting(null)}
          onConfirm={() => deleteEvento(deleting)}
        />
      )}

      {result && <ResultModal ok={result.ok} message={result.msg} onClose={() => setResult(null)} />}
      {openAvisoModal && <AvisoCreateModal onClose={() => setOpenAvisoModal(false)} onCreated={() => {}} />}
      {loading && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="text-white animate-pulse">Cargando datos...</div>
          </div>
      )}

        </div>
      </div>
    );
}



type ModalShellProps = {
  title?: string;
  children: ReactNode;
  maxWidth?: "max-w-sm" | "max-w-lg" | "max-w-3xl" | "max-w-4xl";
  onClose: () => void;
};


let openModalCount = 0;

function ModalShell({
  title,
  children,
  maxWidth = "max-w-3xl",
  onClose,
}: ModalShellProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
   
    openModalCount++;
    document.documentElement.style.overflow = "hidden";
    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className={`relative w-full ${maxWidth} bg-[var(--bg-body)] border border-soft rounded-2xl shadow-2xl flex flex-col`}
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()} 
      >
        {title && (
          <div className="px-5 py-4 border-b border-soft flex justify-between items-center bg-[var(--bg-body)] rounded-t-2xl shrink-0">
            <h3 className="text-lg font-bold text-base-clr tracking-wide">{title}</h3>
            
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); 
                onClose();
              }} 
              className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
              title="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 pointer-events-none">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function DayEventsModal({
  date,
  eventos,
  resumen,
  onClose,
  onEdit,
  onDelete,
  onCreate,
}: {
  date: Date;
  eventos: Evento[];
  resumen: { r: number; l: number; v: number; total: number };
  onClose: () => void;
  onEdit: (ev: Evento) => void;
  onDelete: (ev: Evento) => void;
  onCreate: () => void;
}) {
  return (
    <ModalShell title={`Eventos del ${formatDate(date, { year: "numeric" })}`} onClose={onClose}>
      <div className="flex flex-wrap gap-2 mb-6 text-sm">
        <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
          {resumen.r} {plural(resumen.r, "Reunión", "Reuniones")}
        </span>
        <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
          {resumen.l} {plural(resumen.l, "Llamada", "Llamadas")}
        </span>
        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
          {resumen.v} {plural(resumen.v, "Visita", "Visitas")}
        </span>
      </div>

      {eventos.length === 0 ? (
        <div className="py-8 text-center text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
            No hay eventos agendados.
        </div>
      ) : (
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {eventos.map((ev: any) => (
            <li key={ev.id} className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                        ev.tipo === 'Reunion' ? 'bg-blue-500' : 
                        ev.tipo === 'Llamada' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}></span>
                    
                    <span className="font-semibold text-gray-900 dark:text-white">{formatHour(ev.fecha_hora)}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">· {ev.tipo}</span>
                </div>
              
                <div className="text-sm text-gray-800 dark:text-gray-300 truncate font-medium">
                  🏠 {ev.propiedad_titulo || (ev.propiedad ? `Propiedad #${ev.propiedad}` : "—")}
                </div>

               
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                   👤 {ev.contacto_nombre || (ev.contacto ? `Lead #${ev.contacto}` : "Sin contacto asignado")}
                </div>

                {ev.notas && <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic border-l-2 border-gray-300 dark:border-white/20 pl-2">"{ev.notas}"</div>}
              </div>
              
              <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-white" onClick={() => onEdit(ev)} title="Editar">✏️</button>
                <button className="p-2 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/40 text-rose-600 dark:text-rose-400" onClick={() => onDelete(ev)} title="Eliminar">🗑️</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
        <button className="w-full sm:w-auto h-10 px-4 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white text-sm font-medium transition-colors" onClick={onClose}>Cerrar</button>
        <button className="w-full sm:w-auto h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-all" onClick={onCreate}>+ Agregar Evento</button>
      </div>
    </ModalShell>
  );
}

function EventModal({
  mode,
  baseDate,
  evento,
  contactos,
  propiedades,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  baseDate?: Date;
  evento?: Evento;
  contactos: Contacto[];
  propiedades: Propiedad[];
  onCancel: () => void;
  onSave: (data: Partial<Evento>, mode: "create" | "edit", id?: number) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Evento>>(
    evento
      ? { ...evento }
      : {
        tipo: "Reunion",
        fecha_hora: toLocalInputValue(baseDate || new Date()),
        propiedad: propiedades[0]?.id,
        contacto: undefined,
      }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (form.contacto != null) {
      const c = contactos.find(x => x.id === Number(form.contacto));
      if (c) {
        if (!(form.nombre || form.apellido || form.email)) {
          setForm(f => ({
            ...f,
            nombre: c.nombre || "",
            apellido: c.apellido || "",
            email: c.email || ""
          }));
        }
      }
    }
  }, [form.contacto, contactos]);

  function set<K extends keyof Evento>(k: K, v: Evento[K] | any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit() {
    setError(null);
    if (!form.propiedad) { setError("Seleccioná una propiedad."); return; }
    if (!form.fecha_hora) { setError("Cargá fecha y hora."); return; }
    setSaving(true);
    try {
      let fechaISO = String(form.fecha_hora);
      if (fechaISO.length <= 16 && fechaISO.includes("T")) {
        const d = new Date(fechaISO);
        fechaISO = d.toISOString();
      }
      await onSave(
        {
          ...form,
          fecha_hora: fechaISO,
          contacto: (form as any).contacto === "" ? null : form.contacto,
          email: form.email || undefined,
          nombre: form.nombre || undefined,
          apellido: form.apellido || undefined,
          notas: form.notas || undefined,
        },
        mode,
        evento?.id
      );
    } catch {
      setError("Ocurrió un error. Intentá otra vez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    
    <ModalShell title={mode === "create" ? "Nuevo evento" : "Editar evento"} onClose={onCancel} maxWidth="max-w-3xl">
      
      <div className="flex flex-col gap-6">
 
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Tipo */}
          <div className="md:col-span-1">
             <Field label="Tipo de Evento">
                <select
                  className="rc-input w-full h-10 text-sm"
                  value={form.tipo || "Reunion"}
                  onChange={(e) => set("tipo", e.target.value as Evento["tipo"])}
                >
                  <option value="Reunion">Reunión</option>
                  <option value="Visita">Visita</option>
                  <option value="Llamada">Llamada</option>
                </select>
            </Field>
          </div>

          {/* Fecha */}
          <div className="md:col-span-1">
             <Field label="Fecha y Hora">
                <input
                  type="datetime-local"
                  className="rc-input w-full h-10 text-sm"
                  value={
                      form.fecha_hora && form.fecha_hora.includes("T") && form.fecha_hora.length > 16
                      ? toLocalInputValue(new Date(form.fecha_hora))
                      : String(form.fecha_hora || "")
                  }
                  onChange={(e) => set("fecha_hora", e.target.value)}
                />
            </Field>
          </div>
          
          {/* Propiedad */}
          <div className="md:col-span-2">
             <Field label="Propiedad">
                
                <select
                    className="rc-input w-full h-10 text-sm" 
                    value={String(form.propiedad || "")}
                    onChange={(e) => set("propiedad", Number(e.target.value))}
                >
                    {propiedades.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                        {p.titulo || (p as any).direccion || `Propiedad #${p.id}`}
                    </option>
                    ))}
                </select>
            </Field>
          </div>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/*  Contacto */}
            <div className="p-5 rounded-xl bg-surface-2 border border-soft flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-soft pb-2 mb-1">
                   <h4 className="text-xs font-bold text-muted-clr uppercase tracking-wider">Datos del Contacto</h4>
                </div>

                <div className="space-y-4">
                   <div>
                       <label className="text-[10px] uppercase text-muted-clr font-bold mb-1.5 block">Buscar Lead Existente</label>
                       <ContactAutocomplete
                            valueId={form.contacto == null ? null : Number(form.contacto)}
                            initialList={contactos}
                            onChange={(id, item) => {
                                set("contacto", id);
                                if (item) {
                                    set("nombre", item.nombre || "");
                                    set("apellido", item.apellido || "");
                                    set("email", item.email || "");
                                } else {
                                    set("nombre", "");
                                    set("apellido", "");
                                    set("email", "");
                                }
                            }}
                            onClear={() => {
                                set("contacto", null);
                                set("nombre", "");
                                set("apellido", "");
                                set("email", "");
                            }}
                        />
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase text-muted-clr font-bold mb-1 block">Nombre</label>
                            <input
                                className="rc-input w-full h-9 text-sm"
                                value={form.nombre || ""}
                                onChange={(e) => set("nombre", e.target.value)}
                                placeholder="Ej: Juan"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-muted-clr font-bold mb-1 block">Apellido</label>
                            <input
                                className="rc-input w-full h-9 text-sm"
                                value={form.apellido || ""}
                                onChange={(e) => set("apellido", e.target.value)}
                                placeholder="Ej: Perez"
                            />
                        </div>
                   </div>
                   
                   <div>
                        <label className="text-[10px] uppercase text-muted-clr font-bold mb-1 block">Email</label>
                        <input
                            type="email"
                            className="rc-input w-full h-9 text-sm"
                            value={form.email || ""}
                            onChange={(e) => set("email", e.target.value)}
                            placeholder="juan@ejemplo.com"
                        />
                   </div>
                </div>
            </div>

            {/* Notas */}
            <div className="flex flex-col h-full">
               <label className="block text-xs font-bold text-muted-clr uppercase tracking-wider mb-2 ml-1">Notas Adicionales</label>
               <textarea
                  className="rc-input w-full flex-1 resize-none text-sm p-4 leading-relaxed"
                  value={form.notas || ""}
                  onChange={(e) => set("notas", e.target.value)}
                  placeholder="Escribe aquí los detalles importantes del evento, instrucciones de ingreso, o temas a tratar..."
               />
            </div>
        </div>
      </div>

      {error && <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-500 font-medium">{error}</div>}

      <div className="mt-8 flex items-center justify-end gap-3 pt-5 border-t border-soft">
        <button 
            className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-slate-600 text-slate-600 dark:text-slate-400 dark:border-slate-400 hover:bg-slate-600 hover:text-white dark:hover:bg-slate-500 dark:hover:text-white shadow-sm"
            onClick={onCancel} 
            disabled={saving}
        >
          Cancelar
        </button>
        <button
          className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white shadow-sm"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar Evento"}
        </button>
      </div>
    </ModalShell>
  );
}

function ContactAutocomplete({
  valueId,
  initialList,
  onChange,
  onClear,
}: {
  valueId: number | null;
  initialList: Contacto[];
  onChange: (id: number | null, item?: Contacto | null) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Contacto[]>(initialList || []);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    const t = setTimeout(async () => {
        if (!localStorage.getItem('rc_token')) {
            setItems(initialList.slice(0, 10));
            return;
        }
        const q = query.trim();
        if (!q) {
            setItems(initialList.slice(0, 10));
            return;
        }
        try {
             const res = await fetchLeads({ q, limit: 10 });
             setItems(Array.isArray(res) ? res : res?.results ?? []);
        } catch(e) {}
    }, 300);
    return () => clearTimeout(t);
  }, [query, initialList]);


  const selected = useMemo(
    () => (valueId ? items.find((i) => i.id === valueId) || initialList.find(i => i.id === valueId) : null),
    [valueId, items, initialList]
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(it: Contacto | null) {
    onChange(it ? it.id : null, it || null);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex gap-2">
        <input
          className="rc-input flex-1 h-10"
          placeholder="Buscar lead..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
          onFocus={() => setOpen(true)}
        />
        {valueId != null && (
          <button
            type="button"
            className="h-10 px-3 rounded-lg border border-soft text-xs text-muted-clr hover:bg-surface-2"
            onClick={onClear}
          >
            Limpiar
          </button>
        )}
      </div>

      {valueId != null && selected && (
        <div className="mt-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg inline-block">
          Seleccionado: <strong>{(selected.nombre || "") + " " + (selected.apellido || "")}</strong>
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-soft bg-surface shadow-xl custom-scrollbar">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-clr">Sin resultados…</div>
          ) : (
            items.map((it, idx) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => pick(it)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${idx === highlight ? "bg-blue-600 text-white" : "text-base-clr hover:bg-surface-2"}`}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  <div className="font-medium truncate">{it.nombre} {it.apellido}</div>
                  <div className={`text-xs truncate ${idx === highlight ? "text-blue-100" : "text-muted-clr"}`}>
                    {it.email || "Sin email"}
                  </div>
                </button>
              ))
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  confirmType = "primary",
  onCancel,
  onConfirm,
}: {
    title: string;
    message: string;
    confirmLabel?: string;
    confirmType?: "primary" | "danger";
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  async function go() {
    setWorking(true);
    await onConfirm();
    setWorking(false);
  }
  return (
    <ModalShell title={title} onClose={onCancel} maxWidth="max-w-lg">
      <div className="text-gray-800 dark:text-gray-300">{message}</div>
      <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
        <button className="w-full sm:w-auto h-10 px-4 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white text-sm transition-colors" onClick={onCancel} disabled={working}>
          Cancelar
        </button>
        <button
          className={
            confirmType === "danger"
              ? "w-full sm:w-auto h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium shadow-sm dark:shadow-rose-900/20 transition-all"
              : "w-full sm:w-auto h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-sm dark:shadow-blue-900/20 transition-all"
          }
          onClick={go}
          disabled={working}
        >
          {working ? "Procesando..." : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function ResultModal({ ok, message, onClose }: { ok: boolean; message: string; onClose: () => void }) {
  return (
    <ModalShell title={ok ? "Éxito" : "Error"} onClose={onClose} maxWidth="max-w-sm">
      <div className={`rounded-xl p-4 border ${ok ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300" : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300"}`}>
        <div className="text-sm font-medium">{message}</div>
      </div>
      <div className="mt-5 flex justify-end">
        <button className="h-9 px-4 rounded-lg bg-gray-100 border border-gray-300 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:border-transparent dark:hover:bg-white/20 dark:text-white text-sm transition-colors" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 dark:text-muted-clr uppercase tracking-wider mb-1.5 ml-1">{label}</label>
      {children}
    </div>
  );
}

function AvisoCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [saving, setSaving] = useState(false);

  const getTodayMin = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo || !fecha) return;
    setSaving(true);
    try {
      let fechaISO = String(fecha);
      if (fechaISO.length <= 16 && fechaISO.includes("T")) {
        const d = new Date(fechaISO);
        fechaISO = d.toISOString();
      }
      
      
      await api.post("avisos/", {
        titulo,
        descripcion,
        fecha: fechaISO,
        lead: null,
        propiedad: null,
        evento: null
      });
      
      toast.success("¡Recordatorio programado con éxito!"); 
      onCreated();
      onClose();
    } catch (error: any) {
      console.error("Error creando aviso:", error);
      toast.error("No se pudo programar el recordatorio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Nuevo Recordatorio " onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-muted-clr uppercase tracking-wider mb-1">Título</label>
          <input
            autoFocus
            className="rc-input w-full h-10 text-sm"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder=" "
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-clr uppercase tracking-wider mb-1">Fecha y hora</label>
          <input
            type="datetime-local"
            className="rc-input w-full h-10 text-sm"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            min={getTodayMin()}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-clr uppercase tracking-wider mb-1">Descripción (Opcional)</label>
          <textarea
            className="rc-input w-full resize-none p-3 h-24 text-sm"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Detalles adicionales..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-soft mt-2">
          <button
            type="button"
            className="h-10 px-4 rounded-lg text-sm font-bold border border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white shadow-sm"
            disabled={saving || !titulo || !fecha}
          >
            {saving ? "Guardando..." : "Programar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}