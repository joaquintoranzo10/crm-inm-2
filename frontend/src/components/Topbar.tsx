// src/components/Topbar.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
// CAMBIO: Importamos FiCheckCircle y quitamos los otros íconos
import { FiSearch, FiBell, FiCheckCircle } from "react-icons/fi"; 
import ThemeToggle from "@/components/ThemeToggle";
import { api } from "@/lib/api"; // Asegúrate de que tu wrapper de api esté aquí

/* ===================== Tipos de datos ===================== */
type Evento = {
  id: number;
  tipo?: string;
  fecha_hora?: string;
  propiedad?: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  notas?: string;
};

type Propiedad = {
  id: number;
  titulo?: string;
  direccion?: string;
  estado?: string | null;
  disponibilidad?: string | null;
};

type Usuario = {
  id: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
};

type SearchItem =
  | { type: "evento"; id: number; title: string; subtitle?: string }
  | { type: "propiedad"; id: number; title: string; subtitle?: string }
  | { type: "usuario"; id: number; title: string; subtitle?: string };

// --- CAMBIO: TIPO DE AVISO ACTUALIZADO ---
// Este es el tipo para un objeto Aviso individual que viene de la API
type Aviso = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  fecha: string; // ISO string
  estado: "pendiente" | "completado" | "atrasado";
  lead?: number | null;
  propiedad?: number | null;
  evento?: number | null;
};
// --- FIN CAMBIO ---

/* ===================== Hook simple de debounce ===================== */
function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* ===================== Componente principal ===================== */
export default function Topbar({ title }: { title: string }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("rc_token") || "";
  
  // Eliminamos 'headers' ya que 'api.ts' debe manejar el token
  
  /* --------- Estado del buscador --------- */
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 300);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  /* --------- Estado de la campana (MODIFICADO) --------- */
  const [openBell, setOpenBell] = useState(false);
  const bellWrapRef = useRef<HTMLDivElement | null>(null);
  
  // El estado ahora es un array simple de Avisos
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  
  const [loadingAvisos, setLoadingAvisos] = useState(false);
  const [errorAvisos, setErrorAvisos] = useState<string | null>(null);

  /* --------- Cerrar popovers con click afuera o Escape --------- */
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) setOpenBell(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setOpenBell(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* --------- Buscar cuando cambia q (mínimo 2 caracteres) --------- */
  useEffect(() => {
    async function run() {
      const text = q.trim();
      if (text.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [evRes, prRes, usRes] = await Promise.all([
          api.get(`/eventos/?search=${encodeURIComponent(text)}`),
          api.get(`/propiedades/?search=${encodeURIComponent(text)}`),
          api.get(`/usuarios/`),
        ]);
        
        // Asumiendo que la API devuelve { results: [...] } para listas paginadas
        const eventos: Evento[] = evRes.data?.results ?? (Array.isArray(evRes.data) ? evRes.data : []);
        const propiedades: Propiedad[] = prRes.data?.results ?? (Array.isArray(prRes.data) ? prRes.data : []);
        const usuarios: Usuario[] = usRes.data?.results ?? (Array.isArray(usRes.data) ? usRes.data : []);


        const needle = text.toLowerCase();
        const eventosF = eventos
          .filter((e) =>
            [e.tipo, e.nombre, e.apellido, e.email, e.notas]
              .filter(Boolean)
              .some((s) => String(s).toLowerCase().includes(needle))
          )
          .slice(0, 5)
          .map<SearchItem>((e) => ({
            type: "evento",
            id: e.id,
            title: `${e.tipo ?? "Evento"} ${e.nombre ? `• ${e.nombre}` : ""}`.trim(),
            subtitle: e.fecha_hora ? new Date(e.fecha_hora).toLocaleString() : undefined,
          }));

        const propiedadesF = propiedades
          .filter((p) =>
            [p.titulo, p.direccion, p.estado, p.disponibilidad]
              .filter(Boolean)
              .some((s) => String(s).toLowerCase().includes(needle))
          )
          .slice(0, 5)
          .map<SearchItem>((p) => ({
            type: "propiedad",
            id: p.id,
            title: p.titulo || `Propiedad #${p.id}`,
            subtitle: [p.estado, p.disponibilidad].filter(Boolean).join(" • ") || undefined,
          }));

        const usuariosF = usuarios
          .filter((u) =>
            [u.nombre, u.apellido, u.email, u.telefono]
              .filter(Boolean)
              .some((s) => String(s).toLowerCase().includes(needle))
          )
          .slice(0, 5)
          .map<SearchItem>((u) => ({
            type: "usuario",
            id: u.id,
            title: [u.nombre, u.apellido].filter(Boolean).join(" ") || `Usuario #${u.id}`,
            subtitle: u.email,
          }));

        setResults([...eventosF, ...propiedadesF, ...usuariosF]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [q, token]); // Dependemos de token

  /* --------- Navegación al elegir un resultado --------- */
  function onSelect(item: SearchItem) {
    setOpen(false);
    if (item.type === "propiedad") navigate("/app/propiedades");
    else if (item.type === "usuario") navigate("/app/usuarios");
    else navigate("/app");
  }

  /* --------- Fetch de avisos (MODIFICADO) --------- */
  async function fetchAvisos() {
    if (!token) return;
    setLoadingAvisos(true);
    setErrorAvisos(null);
    try {
      // 1. Llamamos a la nueva API
      const res = await api.get(`/avisos/`);
      
      // 2. La API devuelve un objeto paginado { count, next, previous, results }
      //    Queremos el array 'results'.
      const data: Aviso[] = res.data?.results ?? (Array.isArray(res.data) ? res.data : []);
      setAvisos(data);
    } catch {
      setErrorAvisos("No se pudieron cargar los avisos.");
      setAvisos(null);
    } finally {
      setLoadingAvisos(false);
    }
  }

  useEffect(() => {
    fetchAvisos();
    const id = setInterval(fetchAvisos, 60000); // Refresca cada 60 seg
    return () => clearInterval(id);
  }, [token]);

  // El total de avisos es simplemente el largo del array
  const totalAvisos = avisos?.length ?? 0;

  function goAvisos() {
    setOpenBell(false);
    navigate("/app/avisos");
  }

  // --- NUEVA FUNCIÓN ---
  async function handleMarcarLeido(e: React.MouseEvent, id: number) {
    e.stopPropagation(); // Evita que el clic cierre el dropdown
    
    // 1. Actualiza la UI localmente (optimista)
    //    Filtra el aviso que coincide con el ID.
    setAvisos((prevAvisos) => prevAvisos?.filter((a) => a.id !== id) ?? null);
    
    // 2. Llama a la API en segundo plano
    try {
      await api.post(`/avisos/${id}/marcar-leido/`);
      // Si tuvo éxito, la UI ya está actualizada.
    } catch (err) {
      // Si falla, revierte el estado (o muestra un error)
      setErrorAvisos("Error al marcar aviso. Refrescando...");
      fetchAvisos(); // Refresca la lista completa para revertir
    }
  }
  // --- FIN NUEVA FUNCIÓN ---


  /* --------- Render --------- */
  return (
    <header className="flex items-center justify-between p-4 border-b rc-border">
      <h1 className="text-xl font-semibold rc-text">{title}</h1>

      <div className="flex items-center gap-3">
        {/* ------- Search ------- */}
        <div className="relative" ref={wrapRef}>
          <div className="relative">
            <FiSearch className="absolute left-3 top-2.5 rc-muted pointer-events-none" />
            <input
              placeholder="Buscar (eventos, propiedades, usuarios)…"
              className="rc-input w-72 pl-9 pr-3"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
          </div>

          {open && (loading || results.length > 0 || q.trim().length >= 2) && (
            <div className="absolute z-50 mt-1 w-[28rem] rounded-lg rc-card shadow-lg">
              <div className="max-h-80 overflow-auto">
                {loading && <div className="px-3 py-2 text-sm rc-muted">Buscando…</div>}
                {!loading && q.trim().length >= 2 && results.length === 0 && (
                  <div className="px-3 py-2 text-sm rc-muted">Sin coincidencias</div>
                )}
                {!loading &&
                  results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => onSelect(r)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-app/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium rc-text">{r.title}</span>
                        <span className="text-[10px] uppercase tracking-wide rc-muted">{r.type}</span>
                      </div>
                      {r.subtitle && <div className="text-xs rc-muted">{r.subtitle}</div>}
                    </button>
                  ))}
              </div>

              <div className="border-t rc-border p-2 text-right">
                <span className="text-[11px] rc-muted">Mínimo 2 caracteres • Enter para buscar</span>
              </div>
            </div>
          )}
        </div>

        {/* ------- Campana de avisos (MODIFICADA) ------- */}
        <div className="relative" ref={bellWrapRef}>
          <button
            className="relative h-9 w-9 grid place-items-center rounded-lg border rc-border bg-surface"
            onClick={() => setOpenBell((v) => !v)}
            title="Recordatorios y avisos"
          >
            <FiBell className="text-lg rc-text" />
            {totalAvisos > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] grid place-items-center">
                {totalAvisos > 99 ? "99+" : totalAvisos}
              </span>
            )}
          </button>

          {openBell && (
            <div className="absolute right-0 mt-2 w-104 z-60 rounded-xl border rc-border bg-surface shadow-elev-1 overflow-hidden">
              <div className="px-3 py-2 border-b rc-border flex items-center justify-between">
                <div className="text-sm font-medium rc-text">Recordatorios y avisos</div>
                <button className="text-xs underline rc-text" onClick={goAvisos}>
                  Ver todos
                </button>
              </div>

              {/* --- ÁREA DE AVISOS COMPLETAMENTE NUEVA --- */}
              <div className="max-h-96 overflow-auto">
                {loadingAvisos && <div className="px-3 py-2 text-sm rc-muted">Cargando…</div>}
                {errorAvisos && !loadingAvisos && (
                  <div className="px-3 py-2 text-sm text-rose-500">{errorAvisos}</div>
                )}
                {!loadingAvisos && !errorAvisos && avisos && (
                  <>
                    {avisos.length === 0 && (
                      <div className="p-4 text-center text-sm rc-muted">
                        ¡Estás al día! No hay avisos pendientes.
                      </div>
                    )}
                    <ul className="divide-y rc-border/50">
                      {avisos.map((aviso) => (
                        <li key={aviso.id} className="p-3 hover:bg-black/5 dark:hover:bg-app/5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium rc-text truncate" title={aviso.titulo}>
                                {aviso.titulo}
                              </div>
                              {aviso.descripcion && (
                                <div className="text-xs rc-muted truncate" title={aviso.descripcion}>
                                  {aviso.descripcion}
                                </div>
                              )}
                              <div className="text-xs rc-muted mt-1">
                                {new Date(aviso.fecha).toLocaleString("es-AR", { dateStyle: 'short', timeStyle: 'short' })}
                              </div>
                            </div>
                            <button 
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 -m-1"
                              onClick={(e) => handleMarcarLeido(e, aviso.id)}
                              title="Marcar como leído"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {!loadingAvisos && !errorAvisos && !avisos && (
                  <div className="px-3 py-2 text-sm rc-muted">No hay datos de avisos.</div>
                )}
              </div>
              {/* --- FIN ÁREA DE AVISOS NUEVA --- */}

              <div className="px-2 py-2 border-t rc-border bg-surface-2/50">
                <button className="w-full h-8 rounded-md border rc-border text-xs hover:bg-black/5 dark:hover:bg-white/5" onClick={fetchAvisos}>
                  Actualizar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toggle claro/oscuro */}
        <ThemeToggle />
      </div>
    </header>
  );
}

// ELIMINADO: El componente BucketSmall ya no se usa en este archivo
// function BucketSmall(...) { ... }