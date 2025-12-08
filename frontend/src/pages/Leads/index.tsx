// src/pages/Leads/index.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

/* ----------------------------- Types ----------------------------- */
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

/* --------------------------- Utils / UI --------------------------- */
const STATE_COLORS: Record<string, string> = {
  "en negociacion": "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  negociacion: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  rechazado: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
  vendido: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  nuevo: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
};

const STATUS_BADGE = {
  pendiente: "bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/30",
  vencido: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
  hoy: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30",
  proximo: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
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

/* ----------------------------- Page ------------------------------ */
export default function LeadsPage() {
  const [loading, setLoading] = useState(true);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [estados, setEstados] = useState<EstadoLead[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<Contacto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contacto | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [vencimiento, setVencimiento] = useState<"" | "pendiente" | "vencido" | "hoy" | "proximo">("");
  
  const [busyId, setBusyId] = useState<number | null>(null);

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

      const res = await api.get("contactos/", { params });
      const toArr = (d: any) => (Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : []);
      setContactos(toArr(res.data));
    } catch (e) {
      console.error(e);
      setContactos([]);
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
  }, [q, vencimiento]);

  useEffect(() => {
    window.addEventListener("refrescar-leads", fetchContactos);
    return () => {
      window.removeEventListener("refrescar-leads", fetchContactos);
    };
  }, []); 

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
    for (const r of rows)
      counts[norm((r as any).estadoFase)] =
        (counts[norm((r as any).estadoFase)] || 0) + 1;
    return [
      {
        label: "En negociación",
        value: counts["en negociacion"] || counts["negociacion"] || 0,
      },
      { label: "Rechazados", value: counts["rechazado"] || 0 },
      { label: "Vendidos", value: counts["vendido"] || 0 },
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

  // Evento para abrir el modal global del AppLayout
  function openCreateModal() {
      window.dispatchEvent(new CustomEvent("open-lead-create-modal"));
  }

  /* ----------------------------- UI ------------------------------ */
  return (
    // CONTENEDOR PRINCIPAL: Igual al dashboard, negro sólido #050505
    <div className="relative w-full min-h-screen bg-[#050505] text-white font-sans p-6 overflow-x-hidden">
      
      {/* Fondo fijo grid */}
      <div className="fixed inset-0 -z-10 bg-[#050505]">
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
        </div>
      </div>

      <div className="flex flex-col gap-8 max-w-[1600px] mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
                <h2 className="text-3xl font-black tracking-tighter mb-1">
                    Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Leads</span>
                </h2>
                <div className="text-sm text-gray-400">
                    Administra tus clientes potenciales y seguimientos.
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {estados.length < 4 && (
                    <button
                    className="h-10 px-4 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition-colors"
                    onClick={seedEstados}
                    >
                    Cargar estados por defecto
                    </button>
                )}

                <button
                    className="h-10 px-6 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20"
                    onClick={openCreateModal}
                >
                    + Nuevo Lead
                </button>
            </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpis.map((k) => (
            <div
                key={k.label}
                className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/10 p-5 group hover:bg-white/5 transition-all"
            >
                <div className="relative flex flex-col justify-between h-full">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">{k.label}</span>
                    <div className="text-4xl font-bold text-white tracking-tight">{k.value}</div>
                </div>
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
                    className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-gray-500"
                />
                {q && (
                    <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                    onClick={() => setQ("")}
                    >
                    Limpiar
                    </button>
                )}
            </div>

            <select
                className="h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-gray-300 focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer"
                value={vencimiento}
                onChange={(e) => setVencimiento(e.target.value as any)}
            >
                <option value="" className="bg-[#050505]">Todos los vencimientos</option>
                <option value="pendiente" className="bg-[#050505]">Pendiente</option>
                <option value="vencido" className="bg-[#050505]">Vencido</option>
                <option value="hoy" className="bg-[#050505]">Vence hoy</option>
                <option value="proximo" className="bg-[#050505]">Próximo</option>
            </select>
        </div>

        {/* Tabla (Desktop) */}
        <div className="hidden md:block rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl">
            <table className="w-full text-sm">
                <thead className="bg-white/5 text-gray-400 uppercase text-xs tracking-wider font-semibold border-b border-white/10">
                    <tr>
                        <th className="text-left px-5 py-4">Nombre</th>
                        <th className="text-left px-5 py-4">Contacto</th>
                        <th className="text-left px-5 py-4">Último contacto</th>
                        <th className="text-left px-5 py-4">Próximo contacto</th>
                        <th className="text-left px-5 py-4">Estado</th>
                        <th className="text-right px-5 py-4">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {loading && (
                        <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">Cargando leads...</td></tr>
                    )}
                    {!loading && pageRows.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">No se encontraron leads.</td></tr>
                    )}
                    {!loading && pageRows.map((c) => {
                        const stateKey = norm((c as any).estadoFase);
                        const badge = STATE_COLORS[stateKey] || "bg-gray-500/10 text-gray-400 border border-gray-500/20";
                        const nextLabel = c.proximo_contacto_estado || "Pendiente";
                        const nextChip = statusChipClass(nextLabel);

                        return (
                            <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-5 py-4">
                                    <div className="font-medium text-white">{(c.nombre || "") + " " + (c.apellido || "")}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="text-gray-300">{c.email || "—"}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{c.telefono || "—"}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="text-gray-300">
                                        {formatDate(c.last_contact_at || c.creado_en, true)}
                                    </div>
                                    {typeof c.dias_sin_seguimiento === "number" && (
                                        <div className="text-xs text-gray-500 mt-0.5">Hace {c.dias_sin_seguimiento} días</div>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-300">{formatDate(c.next_contact_at, true)}</span>
                                        <span className={`inline-flex self-start px-2 py-0.5 rounded text-[10px] font-medium border border-transparent ${nextChip}`}>
                                            {nextLabel}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium border border-transparent ${badge}`}>
                                        {(c as any).estadoFase}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                            onClick={() => setEditTarget(c)}
                                            title="Editar"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
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
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-white/[0.02]">
                <button
                    className="h-8 px-3 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Anterior
                </button>
                <div className="text-xs text-gray-500">
                    Página {page} de {totalPages}
                </div>
                <button
                    className="h-8 px-3 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Siguiente
                </button>
            </div>
        </div>

        {/* Cards (Mobile) */}
        <div className="md:hidden space-y-4">
            {loading && <div className="text-center text-sm text-gray-500">Cargando...</div>}
            {!loading && pageRows.map((c) => {
                const stateKey = norm((c as any).estadoFase);
                const badge = STATE_COLORS[stateKey] || "bg-gray-500/10 text-gray-400";
                
                return (
                    <div key={c.id} className="p-4 rounded-xl bg-[#0a0a0a] border border-white/10 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-semibold text-white">{(c.nombre || "") + " " + (c.apellido || "")}</div>
                                <div className="text-xs text-gray-500">{c.email || "—"}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-medium ${badge}`}>
                                {(c as any).estadoFase}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                            <div>
                                <span className="block text-gray-600 uppercase tracking-wider text-[10px]">Teléfono</span>
                                {c.telefono || "—"}
                            </div>
                            <div>
                                <span className="block text-gray-600 uppercase tracking-wider text-[10px]">Próximo</span>
                                {formatDate(c.next_contact_at, true)}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                            <button 
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
                                onClick={() => setEditTarget(c)}
                            >
                                Editar
                            </button>
                            <button 
                                className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400"
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

      {/* --- MODALES --- */}
      {/* (Usamos los modales globales del layout para crear, pero este es local para editar) */}
      {/* Si decides usar el global para crear, el botón "+ Nuevo Lead" debe disparar el evento */}
      
      {/* El modal de edición local (copiado del global pero adaptado) no lo incluí completo 
          porque el código anterior ya tenía uno. ¿Quieres que también estilice ese modal local 
          o prefieres usar el global para todo? 
          
          Por ahora, el botón "+ Nuevo Lead" de arriba dispara el modal global via evento.
          Para editar, se mantiene la lógica local si tienes el componente LeadModal en este archivo.
          Si no lo tienes, avísame y te paso el código del modal estilizado también.
      */}

    </div>
  );
}