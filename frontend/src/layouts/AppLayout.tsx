import { Outlet, useLocation, Link, useNavigate  } from "react-router-dom";
import { createPortal } from "react-dom";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useMemo, useState, useEffect, ReactNode } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import AssistantWidget from "@/components/AssistantWidget";
import { api } from "@/lib/api";

import PropiedadCreateModal from "@/pages/Propiedades/PropiedadCreateModal";
import EventCreateModal from "@/pages/Leads/EventCreateModal";

type EstadoLead = { id: number; fase: string; descripcion?: string };
const norm = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export default function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    
    const token = localStorage.getItem("rc_token");
    
    if (!token) {
     
      navigate("/", { replace: true });
    }
  }, [navigate]);
  


  const sectionTitle = useMemo(() => {
    if (pathname.startsWith("/app/leads")) return "Leads";
    if (pathname.startsWith("/app/propiedades")) return "Propiedades";
    if (pathname.startsWith("/app/usuarios")) return "Usuarios";
    if (pathname.startsWith("/app/avisos")) return "Recordatorios y avisos";
    if (pathname.startsWith("/app/configuracion")) return "Configuración";
    return "Dashboard";
  }, [pathname]);

  usePageTitle(sectionTitle ? `${sectionTitle} · Real Connect` : "Real Connect");

  
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
    <div className="min-h-screen text-base-clr font-sans relative selection:bg-blue-500/30 transition-colors duration-300">
      
      {/*FONDOS */}
      <div className="fixed inset-0 z-0 pointer-events-none w-full h-full">
        

        <div
          className="absolute inset-0 w-full h-full bg-black"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(120, 180, 255, 0.25), transparent 70%), #000000",
          }}
        />

        <div
          className="absolute inset-0 w-full h-full bg-white transition-opacity duration-500 ease-in-out opacity-100 [.dark_&]:opacity-0"
          style={{
            background: "radial-gradient(125% 125% at 50% 90%, #fff 40%, #6366f1 100%)",
          }}
        />
      </div>

    
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />

        {/* Columna principal */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-50">
            <Topbar title={sectionTitle} />
          </header>

          <main className="flex-1 bg-transparent">
            <div className="p-4 md:p-6">
              <Outlet />
            </div>
          </main>

          {/* Footer */}
          <footer className="px-4 py-4 text-xs text-muted-clr border-t border-soft bg-transparent">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <span>© {new Date().getFullYear()} Real Connect</span>
              <Link to="/app" className="hover:text-primary transition-colors">Home</Link>
            </div>
          </footer>
        </div>
      </div>

    
      <AssistantWidget />

      
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
            className="rc-input w-full"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <Field label="Apellido">
          <input
            className="rc-input w-full"
            value={form.apellido}
            onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className="rc-input w-full"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            className="rc-input w-full"
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
          <label className="block text-xs font-bold text-muted-clr uppercase tracking-wider mb-1.5 ml-1">Estado</label>
          <select
            className="rc-input w-full"
            value={form.estadoId}
            onChange={(e) => setForm((f) => ({ ...f, estadoId: e.target.value }))}
          >
            <option value="">— Seleccionar —</option>
            {estados.map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.fase}
              </option>
            ))}
          </select>
        </div>

        <Field label="Próximo contacto (opcional)">
          <input
            type="datetime-local"
            className="rc-input w-full"
            value={form.next_contact_at || ""}
            onChange={(e) => setForm((f) => ({ ...f, next_contact_at: e.target.value }))}
          />
        </Field>

        <Field label="Nota del próximo contacto">
          <input
            className="rc-input w-full"
            value={form.next_contact_note || ""}
            onChange={(e) => setForm((f) => ({ ...f, next_contact_note: e.target.value }))}
            placeholder="Ej: Llamar para confirmar visita"
            maxLength={255}
          />
        </Field>
      </div>

      {error && <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-500">{error}</div>}

      <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-soft">
        <button 
            className="w-full sm:w-auto px-4 py-2 h-10 rounded-xl text-sm font-medium text-muted-clr border border-soft hover:bg-surface-2 hover:text-base-clr transition-colors" 
            onClick={onClose} 
            disabled={saving}
        >
          Cancelar
        </button>
        
        <button
          className="w-full sm:w-auto px-6 py-2 h-10 rounded-xl text-sm font-bold border border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm transition-all disabled:opacity-50 flex items-center justify-center"
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
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-300"
            : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-300"
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
      <label className="block text-xs font-bold text-muted-clr uppercase tracking-wider mb-1.5 ml-1">{label}</label>
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

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative w-full ${maxWidth} bg-surface border border-soft rounded-2xl shadow-2xl overflow-hidden text-base-clr max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
    
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 shrink-0"></div>

        {title && (
          <div className="px-6 py-4 border-b border-soft flex justify-between items-center bg-surface-2">
            <h3 className="text-lg font-bold text-base-clr tracking-wide">{title}</h3>
            <button onClick={onClose} className="text-muted-clr hover:text-base-clr transition-colors">✕</button>
          </div>
        )}
        <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>,
    document.body
  );
}