// src/layouts/AppLayout.tsx
import { Outlet, useLocation, Link } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
// --- CAMBIO: Imports añadidos ---
import { useMemo, useState, useEffect, ReactNode, FormEvent } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import AssistantWidget from "@/components/AssistantWidget";
import { api } from "@/lib/api"; // Importamos API

// --- CAMBIO: Importamos los modales que son archivos separados ---
import PropiedadCreateModal from "@/pages/Propiedades/PropiedadCreateModal";
import EventCreateModal from "@/pages/Leads/EventCreateModal";
// (LeadModal se define abajo)

// --- CAMBIO: Tipos copiados de Leads/index.tsx (necesarios para LeadModal) ---
type EstadoLead = { id: number; fase: string; descripcion?: string };
const norm = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
// --- FIN DE TIPOS COPIADOS ---


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

  // --- NUEVA LÓGICA: ESTADOS DE MODALES GLOBALES ---
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [propiedadModalOpen, setPropiedadModalOpen] = useState(false);

  // Estados para el LeadModal
  const [estados, setEstados] = useState<EstadoLead[]>([]);
  const [modalResult, setModalResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Fetch de estados (necesario para LeadModal)
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

  // Carga inicial de estados para el modal
  useEffect(() => {
    fetchEstados();
  }, []);

  // "Oyentes" para los eventos del Asistente
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
  }, []); // El array vacío asegura que esto solo se ejecute una vez
  // --- FIN LÓGICA DE MODALES ---

  return (
    <div className="min-h-screen bg-app text-base-clr relative z-0">
      <div className="flex">
        <Sidebar />

        {/* Columna principal */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Topbar */}
          <header className="bg-surface border-b border-soft sticky top-0 z-50 shadow-elev-1">
            <Topbar title={sectionTitle} />
          </header>

          {/* Contenido */}
          <main className="flex-1 bg-app">
            <div className="p-4 md:p-6">
              <Outlet />
            </div>
          </main>

          {/* Footer */}
          <footer className="px-4 py-3 text-xs text-muted-clr border-t border-soft bg-surface-2">
            <div className="max-w-7xl mx-auto">
              © {new Date().getFullYear()} Real Connect —{" "}
              <Link to="/app" className="underline hover:no-underline">Home</Link>
            </div>
          </footer>
        </div>
      </div>

      {/* Asistente visible en /app */}
      <AssistantWidget />

      {/* --- RENDER DE MODALES GLOBALES --- */}
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
              // Avisa a la página de Leads que debe recargar
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
              // Avisa al Dashboard que debe recargar eventos
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
            // Avisa a la página de Propiedades que debe recargar
            window.dispatchEvent(new CustomEvent("refrescar-propiedades"));
          }}
        />
      )}

      {/* Toast de resultado para el LeadModal */}
      {modalResult && (
        <ResultModal ok={modalResult.ok} message={modalResult.msg} onClose={() => setModalResult(null)} />
      )}
    </div>
  );
}


// ==================================================================
// --- COMPONENTES MOVIDOS DE Leads/index.tsx A AppLayout.tsx ---
// (LeadModal y sus dependencias)
// ==================================================================

/* ------------------------ Guardado robusto ------------------------ */
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

/* ------------------------- Lead Create/Edit ------------------------- */
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
      setError("No hay estados cargados. Hacé clic en “Cargar estados recomendados”.");
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
            className="w-full h-10 rounded-lg border rc-border rc-card px-3 text-sm outline-none focus:ring-2 ring-blue-500"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Field>
        <Field label="Apellido">
          <input
            className="w-full h-10 rounded-lg border rc-border rc-card px-3 text-sm outline-none focus:ring-2 ring-blue-500"
            value={form.apellido}
            onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className="w-full h-10 rounded-lg border rc-border rc-card px-3 text-sm outline-none focus:ring-2 ring-blue-500"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="tel"
            className="w-full h-10 rounded-lg border rc-border rc-border rc-card px-3 text-sm outline-none focus:ring-2 ring-blue-500"
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
            onKeyDown={(e) => {
              const ok = [
                "Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"
              ];
              if (ok.includes(e.key)) return;
              if ((e.ctrlKey || e.metaKey) && ["a","c","v","x"].includes(e.key.toLowerCase())) return;
              if (!/^\d$/.test(e.key)) e.preventDefault();
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={15}
            placeholder="Sólo números"
          />
        </Field>

        <div className="md:col-span-2">
          <label className="block text-xs mb-1">Estado</label>
          <select
            className="w-full h-10 rounded-lg border rc-border rc-card px-3 text-sm outline-none focus:ring-2 ring-blue-500"
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
            className="w-full h-10 rounded-lg border rc-border rc-card px-3 text-sm outline-none focus:ring-2 ring-blue-500"
            value={form.next_contact_at || ""}
            onChange={(e) => setForm((f) => ({ ...f, next_contact_at: e.target.value }))}
          />
        </Field>

        <Field label="Nota del próximo contacto (opcional)">
          <input
            className="w-full h-10 rounded-lg border rc-border rc-card px-3 text-sm outline-none focus:ring-2 ring-blue-500"
            value={form.next_contact_note || ""}
            onChange={(e) => setForm((f) => ({ ...f, next_contact_note: e.target.value }))}
            placeholder="Ej: Llamar para confirmar visita"
            maxLength={255}
          />
        </Field>
      </div>

      {error && <div className="mt-4 text-sm text-rose-500">{error}</div>}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button className="h-10 px-4 rounded-lg border text-sm" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button
          className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 rc-text text-sm disabled:opacity-60"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </ModalShell>
  );
}

/* --------------------------- Result Modal --------------------------- */
function ResultModal({ ok, message, onClose }: { ok: boolean; message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 1500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div
        className={`w-full rounded-xl border p-5 shadow-elev-1 ${
          ok
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
        }`}
      >
        <div className="text-lg font-semibold mb-2">{ok ? "OK" : "Ups"}</div>
        <div className="text-sm">{message}</div>
        <div className="mt-4 text-right">
          <button className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 rc-text text-sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
  );

}

/* ------------------------------ UI bits ----------------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1">{label}</label>
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
    <div className="fixed inset-0 z-[2000]">
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop" onClick={onClose} aria-hidden="true" />
      {/* Diálogo */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div
          className={`w-full ${maxWidth} rounded-2xl border border-soft bg-surface shadow-elev-1`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {title && (
            <div className="px-5 py-3 border-b border-soft bg-surface-2">
              <h3 className="text-lg font-semibold text-base-clr">{title}</h3>
            </div>
          )}
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}