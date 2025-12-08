// src/components/Topbar.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
// CAMBIO: Importamos FiCheckCircle y quitamos FiSearch
import { FiBell, FiCheckCircle } from "react-icons/fi"; 
import ThemeToggle from "@/components/ThemeToggle";
import { api } from "@/lib/api"; // Asegúrate de que tu wrapper de api esté aquí

/* ===================== Tipos de datos ===================== */
// --- CAMBIO: Tipos de Search (Evento, Propiedad, Usuario, SearchItem) eliminados ---

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

/* ===================== Componente principal ===================== */
export default function Topbar({ title }: { title: string }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("rc_token") || "";
  
  /* --------- CAMBIO: Estados del buscador eliminados --------- */
  // const [query, setQuery] = useState("");
  // const q = useDebouncedValue(query, 300);
  // const [open, setOpen] = useState(false);
  // const [loading, setLoading] = useState(false);
  // const [results, setResults] = useState<SearchItem[]>([]);
  // const wrapRef = useRef<HTMLDivElement | null>(null);

  /* --------- Estado de la campana (MODIFICADO) --------- */
  const [openBell, setOpenBell] = useState(false);
  const bellWrapRef = useRef<HTMLDivElement | null>(null);
  
  // El estado ahora es un array simple de Avisos
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  
  const [loadingAvisos, setLoadingAvisos] = useState(false);
  const [errorAvisos, setErrorAvisos] = useState<string | null>(null);

  /* --------- Cerrar popovers con click afuera o Escape (MODIFICADO) --------- */
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      // CAMBIO: Lógica de wrapRef (buscador) eliminada
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) setOpenBell(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // CAMBIO: Lógica de setOpen(false) (buscador) eliminada
        setOpenBell(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []); // El 'wrapRef' ya no es dependencia

  /* --------- CAMBIO: useEffect de búsqueda eliminado --------- */

  /* --------- CAMBIO: 'onSelect' de búsqueda eliminado --------- */

  /* --------- Fetch de avisos --------- */
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

  /* --------- Función Marcar como leído --------- */
  async function handleMarcarLeido(e: React.MouseEvent, id: number) {
    e.stopPropagation(); // Evita que el clic cierre el dropdown
    
    // 1. Actualiza la UI localmente (optimista)
    setAvisos((prevAvisos) => prevAvisos?.filter((a) => a.id !== id) ?? null);
    
    // 2. Llama a la API en segundo plano
    try {
      await api.post(`/avisos/${id}/marcar-leido/`);
    } catch (err) {
      setErrorAvisos("Error al marcar aviso. Refrescando...");
      fetchAvisos(); // Refresca la lista completa para revertir
    }
  }
  
  /* --------- Render --------- */
  return (
    <header className="flex items-center justify-between p-4 border-b rc-border">
      <h1 className="text-xl font-semibold rc-text">{title}</h1>

      <div className="flex items-center gap-3">
        
        {/* ------- CAMBIO: Search eliminado ------- */}
        
        {/* ------- Campana de avisos ------- */}
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

              {/* --- ÁREA DE AVISOS --- */}
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
              {/* --- FIN ÁREA DE AVISOS --- */}

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