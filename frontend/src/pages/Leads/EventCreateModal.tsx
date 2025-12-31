import type { FormEvent, ReactNode } from "react";
import { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import Modal from "@/components/Modal";
import { api, fetchLeads, type Contacto } from "@/lib/api"; 


type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void; // callback para refrescar listas si querés
};

type PropiedadOption = { id: number; titulo?: string };

function toArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.results)) return data.results as T[];
  return [];
}

// Función para obtener la fecha y hora actual en el formato requerido
function getTodayMin() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EventCreateModal({ open, onClose, onCreated }: Props) {
  const [propsOpts, setPropsOpts] = useState<PropiedadOption[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contactos, setContactos] = useState<Contacto[]>([]); // Lista para el autocomplete
  const [mode, setMode] = useState<"select" | "new">("select"); // "select" o "new"
  const [contactoId, setContactoId] = useState<number | null>(null); // ID del lead existente
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [propiedadId, setPropiedadId] = useState<number | "">("");
  const [fechaHora, setFechaHora] = useState("");
  const [tipo, setTipo] = useState<"Reunion" | "Visita" | "Llamada" | "">("");


  // Carga las propiedades y los contactos al abrir el modal
  useEffect(() => {
    if (!open) return;
    setLoadingProps(true);
    
    const loadProps = axios.get("/api/propiedades/")
      .then((res) => setPropsOpts(toArray<PropiedadOption>(res.data)))
      .catch(() => setPropsOpts([]));
      
    // Carga inicial de contactos para el autocomplete
    const loadContacts = fetchLeads({ limit: 20 }) 
      .then((data) => setContactos(Array.isArray(data) ? data : data?.results ?? []))
      .catch(() => setContactos([]));

    Promise.all([loadProps, loadContacts]).finally(() => {
      setLoadingProps(false);
    });
  }, [open]);

  // Limpia el formulario al cambiar de modo
  function toggleMode() {
    setContactoId(null);
    setNombre("");
    setApellido("");
    setEmail("");
    setMode(mode === "select" ? "new" : "select");
  }

  // Lógica de envío actualizada
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!propiedadId || !fechaHora || !tipo) return;
    
    // Validar que haya un contacto (nuevo o existente)
    if (mode === 'select' && !contactoId) {
        alert("Por favor, seleccioná un contacto existente.");
        return;
    }
    if (mode === 'new' && !email.trim() && !nombre.trim()) {
        alert("Por favor, ingresá al menos un nombre o email para el nuevo visitante.");
        return;
    }

    setSubmitting(true);

    const payload: any = {
      propiedad: propiedadId,
      fecha_hora: new Date(fechaHora).toISOString(),
      tipo,
    };
    
    if (mode === 'select' && contactoId) {
      // Envía el ID del contacto existente
      payload.contacto = contactoId;
    } else if (mode === 'new') {
      // Envía los datos del nuevo visitante (el backend lo creará)
      payload.nombre = nombre;
      payload.apellido = apellido;
      payload.email = email;
    }


    try {
      await api.post("/api/eventos/", payload); // Usamos 'api' para el token
      
      // Disparamos el evento global para refrescar el dashboard
      window.dispatchEvent(new CustomEvent("assistant:refresh-calendar"));
      
      onCreated?.();
      onClose();
      // reset
      setNombre(""); setApellido(""); setEmail(""); setPropiedadId("");
      setFechaHora(""); setTipo(""); setContactoId(null); setMode("select");
    } catch (err) {
      alert("No se pudo crear el evento. Revisá el mapeo de campos del backend.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar evento" maxWidth="sm">
      <form onSubmit={onSubmit} className="space-y-4">

        {mode === 'select' ? (
          <Field label="Contacto (Lead existente)">
            <ContactAutocomplete
              valueId={contactoId}
              initialList={contactos}
              onChange={(id, item) => {
                setContactoId(id);
                
                if (item) {
                  setNombre(item.nombre || "");
                  setApellido(item.apellido || "");
                  setEmail(item.email || "");
                }
              }}
              onClear={() => setContactoId(null)}
            />
            <button type="button" className="text-xs text-blue-500 hover:underline mt-1" onClick={toggleMode}>
              o Agregar como nuevo visitante
            </button>
          </Field>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs">Nuevo Visitante</label>
              <button type="button" className="text-xs text-blue-500 hover:underline" onClick={toggleMode}>
                o Seleccionar existente
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nombre">
                
                <input className="rc-input mt-1 w-full h-10"
                  value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </Field>
              <Field label="Apellido">
                
                <input className="rc-input mt-1 w-full h-10"
                  value={apellido} onChange={(e) => setApellido(e.target.value)} />
              </Field>
            </div>
            <Field label="Email">
              
              <input type="email" className="rc-input mt-1 w-full h-10"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          </div>
        )}
      

        <Field label="Propiedad">
          <select
            className="rc-input mt-1 w-full h-10" 
            value={propiedadId}
            onChange={(e) => setPropiedadId(Number(e.target.value))}
            disabled={loadingProps}
            required
          >
            <option value="">
              {loadingProps ? "Cargando..." : "Seleccioná una propiedad"}
            </option>
            {propsOpts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo ? `${p.titulo} (#${p.id})` : `Propiedad #${p.id}`}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha y hora">
          <input
            type="datetime-local"
            className="rc-input mt-1 w-full h-10" 
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            min={getTodayMin()}
            required
          />
        </Field>

        <Field label="Tipo de evento">
          <select
            className="rc-input mt-1 w-full h-10" 
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
            required
          >
            <option value="">Seleccioná tipo</option>
            <option value="Reunion">Reunión</option>
            <option value="Visita">Visita</option>
            <option value="Llamada">Llamada</option>
          </select>
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button 
            type="button" 
            onClick={onClose}
            className="h-10 px-6 rounded-lg text-sm font-bold transition-all duration-200 border border-gray-400 text-gray-600 dark:text-gray-300 dark:border-gray-500 hover:bg-gray-600 hover:text-white dark:hover:bg-gray-600 dark:hover:text-white shadow-sm transform hover:scale-105 active:scale-95"
          > 
            Cancelar
          </button>
          <button disabled={submitting || !propiedadId || !fechaHora || !tipo}
            className="rounded-md px-4 py-2 text-sm rc-text bg-blue-600 hover:bg-blue-700 disabled:opacity-60"> 
            {submitting ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// Hook de Debounce
function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

// Componente Field 
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1">{label}</label>
      {children}
    </div>
  );
}

// Componente ContactAutocomplete 
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
  const debounced = useDebouncedValue(query, 300);
  const [items, setItems] = useState<Contacto[]>(initialList || []);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (valueId ? (initialList.find((i) => i.id === valueId) || items.find((i) => i.id === valueId)) : null),
    [valueId, items, initialList]
  );
  // Buscar cuando cambia el query debounced
  useEffect(() => {
    let done = false;
    (async () => {
      if (!localStorage.getItem('rc_token')) {
        setItems(initialList.slice(0, 10)); 
        return;
      }
      try {
        const q = debounced.trim();
        if (!q) {
          setItems(initialList.slice(0, 10));
          return;
        }
        const res = await fetchLeads({ q, limit: 10 });
        if (!done) setItems(Array.isArray(res) ? res : res?.results ?? []);
      } catch (e) {
        // no romper el input
      }
    })();
    return () => { done = true; };
  }, [debounced, initialList]);

  // Cerrar al click fuera
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
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[highlight];
      if (it) pick(it);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      {/* Input + estado seleccionado */}
      <div className="flex gap-2">
        <input
          className="rc-input flex-1 h-10 text-sm px-3"
          placeholder="Escribí nombre/apellido/email del lead…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
          onKeyDown={onKey}
          onFocus={() => setOpen(true)}
        />
        {valueId != null ? (
          <button
            type="button"
            className="h-10 px-3 rounded-lg border text-sm"
            onClick={() => { onClear(); }}
            title="Quitar contacto"
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {/* hint seleccionado */}
      {valueId != null && selected && (
        <div className="mt-1 text-xs rc-muted dark:text-gray-300">
          Seleccionado: <strong>{(selected.nombre || "") + " " + (selected.apellido || "")}</strong>
          {selected.email ? ` • ${selected.email}` : ""}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border rc-border bg-surface shadow-xl">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm rc-muted">Sin resultados…</div>
          ) : (
            items.map((it, idx) => {
              const full = `${it.nombre || ""} ${it.apellido || ""}`.trim() || `Lead #${it.id}`;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => pick(it)}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    idx === highlight ? "bg-blue-600 rc-text" : "hover:bg-app dark:hover:rc-card"
                  }`}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  <div className="font-medium truncate">{full}</div>
                  <div className={`text-xs truncate ${idx === highlight ? "opacity-90" : "rc-muted"}`}>
                    {it.email || it.telefono || "—"}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}