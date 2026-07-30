import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";


type EstadoLead = { id: number; fase: string; descripcion?: string };

type Contacto = {
  id: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  estado?: EstadoLead | number | null;
  estado_detalle?: EstadoLead | null;
  last_contact_at?: string | null;
  next_contact_at?: string | null;
  next_contact_note?: string | null;
  proximo_contacto_estado?: string;
  dias_sin_seguimiento?: number | null;
  creado_en?: string;
};


const STATE_COLORS: Record<string, string> = {
  "en negociacion": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30",
  negociacion:      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30",
  rechazado:        "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30",
  vendido:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30",
  nuevo:            "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30",
};

const STATUS_BADGE = {
  pendiente: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400 border border-gray-200 dark:border-gray-500/30",
  vencido:   "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30",
  hoy:       "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30",
  proximo:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30",
};

const norm = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const formatDate = (d?: Date | string | null, withTime = false) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(+date)) return "—";
  const base = date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  if (!withTime) return base;
  const h = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${base} ${h}`;
};

function statusChipClass(label?: string) {
  const t = norm(label);
  if (!t) return STATUS_BADGE.pendiente;
  if (t.startsWith("pendiente")) return STATUS_BADGE.pendiente;
  if (t.startsWith("vencido")) return STATUS_BADGE.vencido;
  if (t.startsWith("vence hoy")) return STATUS_BADGE.hoy;
  if (t.startsWith("próximo") || t.startsWith("proximo")) return STATUS_BADGE.proximo;
  return STATUS_BADGE.pendiente;
}

/*  Page */
export default function LeadsPage() {
  const [loading, setLoading] = useState(true);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [estados, setEstados] = useState<EstadoLead[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  
  // Estados para controlar Modales
  const [editTarget, setEditTarget] = useState<Contacto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contacto | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Contacto | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); 
  const optionStyle = { backgroundColor: "var(--surface)", color: "var(--text-main)" }; 
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [vencimiento, setVencimiento] = useState<"" | "pendiente" | "vencido" | "hoy" | "proximo">("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");

  const PAGE_SIZE = 10;

  async function fetchEstados() {
    try {
      const res = await api.get("estados-lead/");
      const toArr = (d: any) => (Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : []);
      setEstados(toArr(res.data));
    } catch (e) {
      console.error(e);
      setEstados([]);
    }
  }

  async function fetchContactos() {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (q.trim()) params.q = q.trim();
      if (vencimiento) params.vencimiento = vencimiento;
      if (estadoFiltro) params.estado = estadoFiltro;

      const res = await api.get("contactos/", { params });
      const toArr = (d: any) => (Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : []);
      setContactos(toArr(res.data));
    } catch (e) {
      console.error(e);
      setResult({ ok: false, msg: "No se pudieron cargar los leads." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEstados();
  }, []);

  useEffect(() => {
    fetchContactos();
    setPage(1);
  }, [q, vencimiento, estadoFiltro]);

  useEffect(() => {
    window.addEventListener("refrescar-leads", fetchContactos);
    return () => {
      window.removeEventListener("refrescar-leads", fetchContactos);
    };
  }, []);

  /* EDICION Y BORRADO  */

  // Confirmar Borrado
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      await api.delete(`contactos/${deleteTarget.id}/`);
      // Eliminamos localmente para que sea rápido
      setContactos((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error al eliminar", error);
      alert("Error al eliminar el lead");
    } finally {
      setIsProcessing(false);
    }
  }

  // Guardar Edición
  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    setIsProcessing(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        estado: formData.get('estado') ? Number(formData.get('estado')) : null
    };

    try {
      await api.patch(`contactos/${editTarget.id}/`, payload);
      await fetchContactos(); 
      setEditTarget(null);
    } catch (error) {
      console.error("Error al editar", error);
      alert("Error al guardar los cambios");
    } finally {
      setIsProcessing(false);
    }
  }


  /* CALCULOS DE TABLA */
  const estadoById = useMemo(() => {
    const m = new Map<number, EstadoLead>();
    estados.forEach((e) => m.set(e.id, e));
    return m;
  }, [estados]);

  const rows = useMemo(() => {
    let base = contactos.map((c) => {
      let fase = "";
      if (typeof c.estado === "number") {
        fase = estadoById.get(c.estado)?.fase || "";
      } else if (c.estado && typeof c.estado === "object" && "fase" in c.estado) {
        fase = (c.estado as EstadoLead).fase;
      } else if (c.estado_detalle) {
        fase = c.estado_detalle.fase;
      }
      return { ...c, estadoFase: fase || "Nuevo" };
    });

    if (q.trim()) {
      const qq = norm(q);
      base = base.filter((c) =>
        [c.nombre, c.apellido, c.email, c.telefono]
          .map((x) => norm(String(x || "")))
          .some((s) => s.includes(qq))
      );
    }
    return base;
  }, [contactos, estadoById, q]);

  const kpis = useMemo(() => {
    const counts: Record<string, number> = {};
    let vencidos = 0;

    for (const r of rows) {
      const faseKey = norm((r as any).estadoFase);
      counts[faseKey] = (counts[faseKey] || 0) + 1;

      if (norm(r.proximo_contacto_estado).startsWith("vencido")) {
        vencidos++;
      }
    }

    return [
      {label: "En negociación", value: counts["en negociacion"] || counts["negociacion"] || 0,},
      { label: "Rechazados", value: counts["rechazado"] || 0 },
      { label: "Vendidos", value: counts["vendido"] || 0 },
      { label: "Vencidos", value: vencidos },
    ];
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function seedEstados() {
    try {
      await Promise.all([
        api.post("estados-lead/", { fase: "Nuevo", descripcion: "" }),
        api.post("estados-lead/", { fase: "En negociación", descripcion: "" }),
        api.post("estados-lead/", { fase: "Rechazado", descripcion: "" }),
        api.post("estados-lead/", { fase: "Vendido", descripcion: "" }),
      ]);
      await fetchEstados();
      setResult({ ok: true, msg: "Estados cargados correctamente." });
    } catch (e) {
      console.error(e);
      setResult({ ok: false, msg: "No se pudieron cargar los estados." });
    }
  }

  function openCreateModal() {
      window.dispatchEvent(new CustomEvent("open-lead-create-modal"));
  }

  return (
    <div className="relative w-full h-full">
 
      <div className="flex flex-col gap-8 max-w-[1600px] mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
                <h2 className="text-3xl font-black tracking-tighter mb-1 text-base-clr">
                    Gestión de Leads
                </h2>
                <div className="text-sm text-muted-clr">
                    Administra tus clientes potenciales y seguimientos.
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {estados.length < 4 && (
                    <button
                    className="h-10 px-4 rounded-xl border border-soft text-muted-clr text-xs font-medium hover:bg-surface-2 hover:text-base-clr transition-colors"
                    onClick={seedEstados}
                    >
                    Cargar estados por defecto
                    </button>
                )}

                <button
                    className="h-10 px-4 rounded-lg text-sm font-bold transition-all border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white shadow-sm flex items-center gap-2"
                    onClick={openCreateModal}
                >
                    
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M10 3a3 3 0 100 6 3 3 0 000-6zm-4.6 9a6.6 6.6 0 019.2 0 .75.75 0 01-.287 1.198C12.624 14.378 11.345 15 10 15s-2.624-.622-4.313-1.802A.75.75 0 015.4 12z" clipRule="evenodd" />
                    </svg>
                    <span>Registrar Lead</span>
                </button>
            </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
            <div
                key={k.label}
                className="relative overflow-hidden rounded-2xl bg-surface p-5 group transition-all duration-300 ease-in-out
                           shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
                           hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)]
                           border-t border-white/40 dark:border-white/5"
            >
                <div className={`absolute top-0 left-0 w-1 h-full opacity-50 group-hover:opacity-100 transition-opacity
                    ${k.label === 'Vencidos' ? 'bg-rose-500' : 'bg-blue-500'} 
                `}></div>

                <div className="relative flex flex-col justify-between h-full z-10">
                    <span className="text-sm font-medium text-muted-clr uppercase tracking-wider mb-2">
                        {k.label}
                    </span>
                    <div className={`text-4xl font-bold tracking-tight ${k.label === 'Vencidos' ? 'text-rose-600 dark:text-rose-400' : 'text-base-clr'}`}>
                        {k.value}
                    </div>
                </div>

                 <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            </div>
            ))}
        </section>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
    
          
          <div className="relative flex-1">
              <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre, email o teléfono..."
                  className="rc-input w-full h-11 pl-4"
              />
              {q && (
                  <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-clr hover:text-base-clr"
                      onClick={() => setQ("")}
                  >
                      Limpiar
                  </button>
              )}
          </div>

        
          
          <div className="w-full md:w-56 shrink-0">
              <select
                  className="rc-input w-full h-11 cursor-pointer"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(e.target.value as any)}
              >
                  <option value="" style={optionStyle}>Todos los vencimientos</option>
                  <option value="pendiente" style={optionStyle}>Pendiente</option>
                  <option value="vencido" style={optionStyle}>Vencido</option>
                  <option value="hoy" style={optionStyle}>Vence hoy</option>
                  <option value="proximo" style={optionStyle}>Próximo</option>
              </select>
          </div>

        
          <div className="w-full md:w-56 shrink-0">
              <select
                  className="rc-input w-full h-11 cursor-pointer"
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
              >
                  <option value="" style={optionStyle}>Todos los estados</option>
                  {estados.map((e) => (
                      <option key={e.id} value={e.id} style={optionStyle}>{e.fase}</option>
                  ))}
              </select>
          </div>
      </div>

        {/* Tabla (Desktop) */}
        <div className="hidden md:block rounded-2xl border border-soft bg-surface overflow-hidden shadow-sm">
            <table className="w-full text-sm">
                <thead className="bg-surface-2 text-muted-clr uppercase text-xs tracking-wider font-semibold border-b border-soft">
                    <tr>
                        <th className="text-left px-5 py-4">Nombre</th>
                        <th className="text-left px-5 py-4">Contacto</th>
                        <th className="text-left px-5 py-4">Último contacto</th>
                        <th className="text-left px-5 py-4">Próximo contacto</th>
                        <th className="text-left px-5 py-4">Estado</th>
                        <th className="text-right px-5 py-4">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-soft">
                    {loading && (
                        <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-clr">Cargando leads...</td></tr>
                    )}
                    {!loading && pageRows.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-clr">No se encontraron leads.</td></tr>
                    )}
                    {!loading && pageRows.map((c) => {
                        const stateKey = norm((c as any).estadoFase);
                        const badge = STATE_COLORS[stateKey] || "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400";
                        const nextLabel = c.proximo_contacto_estado || "Pendiente";
                        const nextChip = statusChipClass(nextLabel);

                        return (
                            <tr key={c.id} className="hover:bg-surface-2 transition-colors group">
                                <td className="px-5 py-4">
                                    <div className="font-medium text-base-clr">{(c.nombre || "") + " " + (c.apellido || "")}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="text-base-clr">{c.email || "—"}</div>
                                    <div className="text-xs text-muted-clr mt-0.5">{c.telefono || "—"}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="text-base-clr">
                                        {formatDate(c.last_contact_at || c.creado_en, true)}
                                    </div>
                                    {typeof c.dias_sin_seguimiento === "number" && (
                                        <div className="text-xs text-muted-clr mt-0.5">Hace {c.dias_sin_seguimiento} días</div>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-base-clr">{formatDate(c.next_contact_at, true)}</span>
                                        <span className={`inline-flex self-start px-2 py-0.5 rounded text-[10px] font-medium ${nextChip}`}>
                                            {nextLabel}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${badge}`}>
                                        {(c as any).estadoFase}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex justify-end gap-2"> 
                                        <button 
                                            className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-zinc-600 text-zinc-600 dark:text-zinc-400 dark:border-zinc-400 hover:bg-zinc-600 hover:text-white dark:hover:bg-zinc-500 dark:hover:text-white shadow-sm"
                                            onClick={() => setEditTarget(c)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="h-10 px-4 rounded-lg text-sm font-bold transition-all border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white shadow-sm"
                                            onClick={() => setHistoryTarget(c)}
                                            title="Ver Historial"
                                        >
                                            📝 Historial
                                        </button>

                                        <button 
                                            className="h-10 px-5 rounded-lg text-sm font-bold transition-all border border-red-600 text-red-600 dark:text-red-500 dark:border-red-500 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white"
                                            onClick={() => setDeleteTarget(c)}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            
            {/* Paginación */}
             <div className="flex items-center justify-between px-5 py-3 border-t border-soft bg-surface-2/30">
                <button
                    className="h-8 px-3 rounded-lg border border-soft text-xs text-muted-clr hover:text-base-clr hover:bg-surface-2 disabled:opacity-30"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Anterior
                </button>
                <div className="text-xs text-muted-clr">
                    Página {page} de {totalPages}
                </div>
                <button
                    className="h-8 px-3 rounded-lg border border-soft text-xs text-muted-clr hover:text-base-clr hover:bg-surface-2 disabled:opacity-30"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Siguiente
                </button>
            </div>
        </div>

        {/* Cards (Mobile) */}
        <div className="md:hidden space-y-4">
            {loading && <div className="text-center text-sm text-muted-clr">Cargando...</div>}
            {!loading && pageRows.map((c) => {
                const stateKey = norm((c as any).estadoFase);
                const badge = STATE_COLORS[stateKey] || "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400";
                
                return (
                    <div key={c.id} className="p-4 rounded-xl bg-surface border border-soft space-y-3 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-semibold text-base-clr">{(c.nombre || "") + " " + (c.apellido || "")}</div>
                                <div className="text-xs text-muted-clr">{c.email || "—"}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-medium ${badge}`}>
                                {(c as any).estadoFase}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-clr">
                            <div>
                                <span className="block text-base-clr font-bold uppercase tracking-wider text-[10px]">Teléfono</span>
                                {c.telefono || "—"}
                            </div>
                            <div>
                                <span className="block text-base-clr font-bold uppercase tracking-wider text-[10px]">Próximo</span>
                                {formatDate(c.next_contact_at, true)}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-soft">
                            <button 
                                className="px-3 py-1.5 rounded-lg border border-soft text-xs text-base-clr hover:bg-surface-2"
                                onClick={() => setEditTarget(c)}
                            >
                                Editar
                            </button>

                            <button
                                className="px-3 py-1.5 rounded-lg border border-blue-200 text-xs text-blue-600 dark:border-blue-500/30 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                onClick={() => setHistoryTarget(c)}
                            >
                                Historial
                            </button>

                            <button 
                                className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500"
                                onClick={() => setDeleteTarget(c)}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>

      </div>

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface border border-soft rounded-2xl p-6 shadow-2xl text-base-clr">
            <h3 className="text-lg font-bold mb-2">Eliminar Lead</h3>
            <p className="text-sm text-muted-clr mb-6">
              ¿Estás seguro de que deseas eliminar a <span className="font-medium text-base-clr">{deleteTarget.nombre} {deleteTarget.apellido}</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
                <button 
                    onClick={() => setDeleteTarget(null)}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl text-sm font-bold border border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleConfirmDelete}
                    disabled={isProcessing}
                    className="h-10 px-5 rounded-lg text-sm font-bold transition-all border border-red-600 text-red-600 dark:text-red-500 dark:border-red-500 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white"
                >
                    {isProcessing ? "Eliminando..." : "Eliminar"}
                </button>
            </div>
          </div>
        </div>
      )}

      {historyTarget && (
        <LeadHistoryModal
            contacto={historyTarget}
            onClose={() => setHistoryTarget(null)}
       />
      )}

      {/* MODAL DE EDICIÓN */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface border border-soft rounded-2xl p-6 shadow-2xl text-base-clr">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Editar Lead</h3>
                <button onClick={() => setEditTarget(null)} className="text-muted-clr hover:text-base-clr">✕</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs uppercase text-muted-clr font-semibold tracking-wider">Nombre</label>
                        <input 
                            name="nombre" 
                            defaultValue={editTarget.nombre || ''}
                            className="rc-input w-full h-10"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs uppercase text-muted-clr font-semibold tracking-wider">Apellido</label>
                        <input 
                            name="apellido" 
                            defaultValue={editTarget.apellido || ''}
                            className="rc-input w-full h-10"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs uppercase text-muted-clr font-semibold tracking-wider">Email</label>
                    <input 
                        name="email" 
                        type="email"
                        defaultValue={editTarget.email || ''}
                        className="rc-input w-full h-10"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs uppercase text-muted-clr font-semibold tracking-wider">Teléfono</label>
                    <input 
                        name="telefono" 
                        defaultValue={editTarget.telefono || ''}
                        className="rc-input w-full h-10"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs uppercase text-muted-clr font-semibold tracking-wider">Estado</label>
                    <select 
                        name="estado"
                        defaultValue={
                            typeof editTarget.estado === 'object' 
                            ? editTarget.estado?.id 
                            : editTarget.estado || ""
                        }
                        className="rc-input w-full h-10 cursor-pointer"
                    >
                        {estados.map(e => (
                            <option key={e.id} value={e.id}>{e.fase}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 mt-4 border-t border-soft">
                    <button 
                        type="button"
                        onClick={() => setEditTarget(null)}
                        disabled={isProcessing}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold border border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        disabled={isProcessing}
                        className="w-full sm:w-auto px-6 py-2 rounded-xl text-sm font-bold border border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm transition-all disabled:opacity-50"
                    >
                        {isProcessing ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function LeadHistoryModal({ contacto, onClose }: { contacto: Contacto; onClose: () => void }) {
  const [notas, setNotas] = useState<any[]>([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    
    api.get(`historial/`, { params: { contacto: contacto.id } })
      .then((res) => {
          
          const data = Array.isArray(res.data) ? res.data : [];
          setNotas(data.filter((n: any) => n.contacto === contacto.id));
      })
      .catch(() => setNotas([]))
      .finally(() => setLoading(false));
  }, [contacto.id]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaNota.trim()) return;
    setSaving(true);
    
    try {
      const res = await api.post(`historial/`, { 
          nota: nuevaNota,
          contacto: contacto.id 
      });
      setNotas([res.data, ...notas]);
      setNuevaNota("");
    } catch (error) {
      console.error("Error al guardar la nota:", error);
      alert("Asegurate de tener el endpoint configurado en Django. Simulando guardado local por ahora...");
      
      const notaSimulada = {
        id: Date.now(),
        nota: nuevaNota,
        creado_en: new Date().toISOString(),
        contacto: contacto.id
      };
      setNotas([notaSimulada, ...notas]);
      setNuevaNota("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(notaId: number) {
    if (!window.confirm("¿Seguro que querés eliminar esta nota?")) return;
    
    try {
      await api.delete(`historial/${notaId}/`);
      setNotas(prevNotas => prevNotas.filter(n => n.id !== notaId));
    } catch (error) {
      console.error("Error al eliminar la nota:", error);
      alert("No se pudo eliminar la nota.");
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-surface border border-soft rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-soft flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-base-clr">Historial de Interacciones</h3>
            <p className="text-sm text-muted-clr">Lead: {contacto.nombre} {contacto.apellido}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-2 text-muted-clr hover:text-base-clr text-lg font-bold transition-colors">✕</button>
        </div>

        
        <div className="p-6 border-b border-soft bg-surface-2 shrink-0">
          <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              placeholder="Ej: No contestó la llamada, volver a intentar mañana..."
              className="rc-input flex-1 h-11 px-4 text-sm"
            />
            <button
              type="submit"
              disabled={saving || !nuevaNota.trim()}
              className="h-11 px-6 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 shrink-0 shadow-sm"
            >
              {saving ? "Guardando..." : "Agregar Nota"}
            </button>
          </form>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-surface">
          {loading ? (
            <div className="text-center text-muted-clr py-10 animate-pulse font-medium">Cargando historial...</div>
          ) : notas.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-soft rounded-xl text-muted-clr bg-surface-2/30 font-medium">
              Aún no hay registros para este lead. Escribí el primero arriba.
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-soft before:to-transparent">
              {notas.map((n, idx) => {
                const date = new Date(n.creado_en);
                return (
                  <div key={n.id || idx} className="relative flex items-start gap-4 group">
                   
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-blue-500 text-white shadow-sm shrink-0 z-10 relative mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.58-2.579a44.126 44.126 0 003.203.279c1.439 0 2.433-1.258 2.433-2.67V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zm0 7a1 1 0 100-2 1 1 0 000 2zM8 8a1 1 0 11-2 0 1 1 0 012 0zm5 1a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                   
                    <div className="flex-1 p-4 rounded-xl border border-soft bg-surface-2 shadow-sm transition-all hover:shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <span className="font-bold text-base-clr text-sm">Nota de seguimiento</span>
                        
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <time className="text-[11px] font-medium text-muted-clr bg-surface px-2.5 py-1 rounded-md border border-soft">
                            {date.toLocaleDateString("es-AR", { day: '2-digit', month: 'short' })} a las {date.toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}
                          </time>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="text-xs p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors border border-transparent hover:border-rose-500/20"
                            title="Eliminar nota"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-base-clr whitespace-pre-line leading-relaxed">{n.nota}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}