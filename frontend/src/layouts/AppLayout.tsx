// src/layouts/AppLayout.tsx
import { Outlet, useLocation, Link } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useMemo, useState, useEffect, ReactNode, FormEvent } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import AssistantWidget from "@/components/AssistantWidget";
import { api } from "@/lib/api";

import PropiedadCreateModal from "@/pages/Propiedades/PropiedadCreateModal";
import EventCreateModal from "@/pages/Leads/EventCreateModal";

// --- Tipos copiados ---
type EstadoLead = { id: number; fase: string; descripcion?: string };
const norm = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export default function AppLayout() {
  const { pathname } = useLocation();

  const sectionTitle = useMemo(() => {
    if (pathname.startsWith("/app/leads")) return "Leads";
    if (pathname.startsWith("/app/propiedades")) return "Propiedades";
    if (pathname.startsWith("/app/usuarios")) return "Usuarios";
    if (pathname.startsWith("/app/avisos")) return "Recordatorios y avisos";
    if (pathname.startsWith("/app/configuracion")) return "Configuración";
    return "Dashboard";
  }, [pathname]);

  usePageTitle(sectionTitle ? `${sectionTitle} · Real Connect` : "Real Connect");

  // --- LÓGICA DE MODALES GLOBALES ---
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [propiedadModalOpen, setPropiedadModalOpen] = useState(false);

  const [estados, setEstados] = useState<EstadoLead[]>([]);
  const [modalResult, setModalResult] = useState<{ ok: boolean; msg: string } | null>(null);

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

  useEffect(() => {
    fetchEstados();
  }, []);

  useEffect(() => {
    const handleOpenLead = () => setLeadModalOpen(true);
    const handleOpenEvent = () => setEventModalOpen(true);
    const handleOpenPropiedad = () => setPropiedadModalOpen(true);

    window.addEventListener("open-lead-create-modal", handleOpenLead);
    window.addEventListener("open-event-create-modal", handleOpenEvent);
    window.addEventListener("open-propiedad-create-modal", handleOpenPropiedad);

    return () => {
      window.removeEventListener("open-lead-create-modal", handleOpenLead);
      window.removeEventListener("open-event-create-modal", handleOpenEvent);
      window.removeEventListener("open-propiedad-create-modal", handleOpenPropiedad);
    };
  }, []);

  return (
    // CORRECCIÓN 1: Fondo negro sólido global (#050505) y texto blanco.
    // Esto elimina el "marco azul" externo.
    <div className="min-h-screen bg-[#050505] text-white font-sans relative z-0 selection:bg-blue-500/30">
      <div className="flex">
        <Sidebar />

        {/* Columna principal */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Topbar: Quitamos bg-surface/border-soft para que no choque con el Topbar.tsx que ya tiene estilos */}
          <header className="sticky top-0 z-50">
            <Topbar title={sectionTitle} />
          </header>

          {/* Contenido: Fondo negro continuo */}
          <main className="flex-1 bg-[#050505]">
            <div className="p-4 md:p-6">
              <Outlet />
            </div>
          </main>

          {/* Footer: Estilo oscuro minimalista */}
          <footer className="px-4 py-4 text-xs text-gray-600 border-t border-white/5 bg-[#050505]">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <span>© {new Date().getFullYear()} Real Connect</span>
              <Link to="/app" className="hover:text-white transition-colors">Home</Link>
            </div>
          </footer>
        </div>
      </div>

      {/* Asistente */}
      <AssistantWidget />

      {/* --- RENDER DE MODALES --- */}
      {leadModalOpen && (
        <LeadModal
          title="Nuevo Lead"
          estados={estados}
          onClose={() => setLeadModalOpen(false)}
          onSubmit={async (payload) => {
            try {
              await saveContacto("contactos/", "post", payload);
              setLeadModalOpen(false);
              setModalResult({ ok: true, msg: "Lead creado correctamente." });
              window.dispatchEvent(new CustomEvent("refrescar-leads"));
            } catch (e) {
              console.error(e);
              setModalResult({ ok: false, msg: "No se pudo crear el lead." });
            }
          }}
        />
      )}

      {eventModalOpen && (
         <EventCreateModal
            open={eventModalOpen}
            onClose={() => setEventModalOpen(false)}
            onCreated={() => {
              setEventModalOpen(false);
              window.dispatchEvent(new CustomEvent("assistant:refresh-calendar"));
            }}
         />
      )}

      {propiedadModalOpen && (
        <PropiedadCreateModal
          open={propiedadModalOpen}
          onClose={() => setPropiedadModalOpen(false)}
          onCreated={() => {
            setPropiedadModalOpen(false);
            window.dispatchEvent(new CustomEvent("refrescar-propiedades"));
          }}
        />
      )}

      {modalResult && (
        <ResultModal ok={modalResult.ok} message={modalResult.msg} onClose={() => setModalResult(null)} />
      )}
    </div>
  );
}


// ==================================================================
// --- COMPONENTES INTERNOS (Estilos actualizados a Dark) ---
// ==================================================================

async function saveContacto(
  url: string,
  method: "post" | "patch",
  data: {
    nombre?: string;
    apellido?: string;
    email?: string;
    telefono?: string;
    estado?: number | null;
    next_contact_at?: string | null;
    next_contact_note?: string | null;
  }
) {
  try {
    await api({ url, method, data });
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 400) {
      const alt: any = { ...data };
      if (typeof (data as any).estado !== "undefined") {
        alt.estado_id = (data as any).estado;
        delete alt.estado;
      }
      await api({ url, method, data: alt });
    } else {
      throw err;
    }
  }
}

function LeadModal({
  title,
  estados,
  defaultValues,
  onClose,
  onSubmit,
}: {
  title: string;
  estados: EstadoLead[];
  defaultValues?: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    estadoId: string;
    next_contact_at?: string;
    next_contact_note?: string;
  };
  onClose: () => void;
  onSubmit: (payload: any) => void | Promise<void>;
}) {
  const [form, setForm] = useState(
    defaultValues || {
      nombre: "",
      apellido: "",
      email: "",
      telefono: "",
      estadoId: "",
      next_contact_at: "",
      next_contact_note: "",
    }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nuevoId = useMemo(
    () => estados.find((e) => norm(e.fase) === "nuevo")?.id,
    [estados]
  );

  function dtLocalToISO(v: string | undefined) {
    if (!v) return undefined;
    const d = new Date(v);
    if (isNaN(+d)) return undefined;
    return d.toISOString();
  }

  async function handleSubmit() {
    setError(null);
    if (!form.nombre && !form.email) {
      setError("Ingresá al menos nombre o email.");
      return;
    }
    const estadoElegido = form.estadoId || (nuevoId ? String(nuevoId) : "");
    if (!estadoElegido) {
      setError("No hay estados cargados.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        nombre: form.nombre || undefined,
        apellido: form.apellido || undefined,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        estado: Number(estadoElegido),
      };

      if (form.next_contact_at) payload.next_contact_at = dtLocalToISO(form.next_contact_at);
      if (form.next_contact_note) payload.next_contact_note = form.next_contact_note;

      await onSubmit(payload);
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={title} onClose={onClose} maxWidth="max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre">
          <input
            className="w-full h-10 rounded-lg bg-black/20 border border-white/10 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <Field label="Apellido">
          <input
            className="w-full h-10 rounded-lg bg-black/20 border border-white/10 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
            value={form.apellido}
            onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className="w-full h-10 rounded-lg bg-black/20 border border-white/10 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            className="w-full h-10 rounded-lg bg-black/20 border border-white/10 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
            value={form.telefono}
            onChange={(e) =>
              setForm(f => ({ ...f, telefono: e.target.value.replace(/\D/g, "") }))
            }
            onPaste={(e) => {
              const pasted = (e.clipboardData || (window as any).clipboardData).getData("text");
              if (/\D/.test(pasted)) {
                e.preventDefault();
                const digits = pasted.replace(/\D/g, "");
                setForm(f => ({ ...f, telefono: (f.telefono || "") + digits }));
              }
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={15}
            placeholder="Solo números"
          />
        </Field>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Estado</label>
          <select
            className="w-full h-10 rounded-lg bg-black/20 border border-white/10 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
            value={form.estadoId}
            onChange={(e) => setForm((f) => ({ ...f, estadoId: e.target.value }))}
          >
            <option value="" className="bg-[#050505]">— Seleccionar —</option>
            {estados.map((e) => (
              <option key={e.id} value={String(e.id)} className="bg-[#050505]">
                {e.fase}
              </option>
            ))}
          </select>
        </div>

        <Field label="Próximo contacto (opcional)">
          <input
            type="datetime-local"
            className="w-full h-10 rounded-lg bg-black/20 border border-white/10 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
            value={form.next_contact_at || ""}
            onChange={(e) => setForm((f) => ({ ...f, next_contact_at: e.target.value }))}
          />
        </Field>

        <Field label="Nota del próximo contacto">
          <input
            className="w-full h-10 rounded-lg bg-black/20 border border-white/10 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
            value={form.next_contact_note || ""}
            onChange={(e) => setForm((f) => ({ ...f, next_contact_note: e.target.value }))}
            placeholder="Ej: Llamar para confirmar visita"
            maxLength={255}
          />
        </Field>
      </div>

      {error && <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">{error}</div>}

      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
        <button className="h-10 px-4 rounded-lg border border-white/10 hover:bg-white/10 text-white text-sm" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button
          className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-900/20 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar Lead"}
        </button>
      </div>
    </ModalShell>
  );
}

function ResultModal({ ok, message, onClose }: { ok: boolean; message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <div
        className={`w-full rounded-xl border p-5 shadow-2xl ${
          ok
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
        }`}
      >
        <div className="text-lg font-bold mb-2">{ok ? "¡Listo!" : "Error"}</div>
        <div className="text-sm">{message}</div>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
      {children}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  maxWidth = "max-w-3xl",
  children,
}: {
  title?: string;
  onClose: () => void;
  maxWidth?: "max-w-sm" | "max-w-lg" | "max-w-2xl" | "max-w-3xl";
  children: React.ReactNode;
}) {
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative w-full ${maxWidth} bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Glow */}
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