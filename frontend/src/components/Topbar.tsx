import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheckCircle } from "react-icons/fi"; 
import ThemeToggle from "@/components/ThemeToggle"; 
import { api } from "@/lib/api"; 

/* ===================== Tipos ===================== */
type Aviso = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  fecha: string; 
  estado: "pendiente" | "completado" | "atrasado";
  lead?: number | null;
  propiedad?: number | null;
  evento?: number | null;
};

/* ===================== Componente principal ===================== */
export default function Topbar({ title }: { title: string }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("rc_token") || "";
  
  const [openBell, setOpenBell] = useState(false);
  const bellWrapRef = useRef<HTMLDivElement | null>(null);
  
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [loadingAvisos, setLoadingAvisos] = useState(false);
  const [errorAvisos, setErrorAvisos] = useState<string | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) setOpenBell(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenBell(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function fetchAvisos() {
    if (!token) return;
    setLoadingAvisos(true);
    setErrorAvisos(null);
    try {
      const res = await api.get(`/avisos/`);
      const data: Aviso[] = res.data?.results ?? (Array.isArray(res.data) ? res.data : []);
      setAvisos(data);
    } catch {
      setErrorAvisos("Error al cargar.");
      setAvisos(null);
    } finally {
      setLoadingAvisos(false);
    }
  }

  useEffect(() => {
    fetchAvisos();
    const id = setInterval(fetchAvisos, 60000); 
    return () => clearInterval(id);
  }, [token]);

  const totalAvisos = avisos?.length ?? 0;

  function goAvisos() {
    setOpenBell(false);
    navigate("/app/avisos");
  }

  async function handleMarcarLeido(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setAvisos((prevAvisos) => prevAvisos?.filter((a) => a.id !== id) ?? null);
    try {
      await api.post(`/avisos/${id}/marcar-leido/`);
    } catch (err) {
      fetchAvisos(); 
    }
  }
  
  return (
    // CORRECCIÓN: Fondo negro con transparencia y blur para que se funda con el resto
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md">
      
      <h1 className="text-xl font-bold text-white tracking-tight">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        
        {/* Campana */}
        <div className="relative" ref={bellWrapRef}>
          <button
            className={`relative h-10 w-10 grid place-items-center rounded-xl border transition-all duration-200
                ${openBell 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}
            `}
            onClick={() => setOpenBell((v) => !v)}
            title="Notificaciones"
          >
            <FiBell className="text-lg" />
            {totalAvisos > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#050505]">
                {totalAvisos > 9 ? "9+" : totalAvisos}
              </span>
            )}
          </button>

          {/* Dropdown Avisos */}
          {openBell && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 z-50 rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden ring-1 ring-white/5">
              
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="text-sm font-semibold text-white">Notificaciones</div>
                <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors" onClick={goAvisos}>
                  Ver todas
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {loadingAvisos && <div className="px-4 py-8 text-center text-sm text-gray-500">Cargando...</div>}
                
                {errorAvisos && !loadingAvisos && (
                  <div className="px-4 py-4 text-sm text-rose-400 text-center">{errorAvisos}</div>
                )}
                
                {!loadingAvisos && !errorAvisos && avisos && (
                  <>
                    {avisos.length === 0 && (
                      <div className="px-4 py-12 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <FiBell className="text-gray-600 text-xl" />
                        </div>
                        <p className="text-sm text-gray-400">Sin notificaciones</p>
                      </div>
                    )}
                    <ul className="divide-y divide-white/5">
                      {avisos.map((aviso) => (
                        <li key={aviso.id} className="group hover:bg-white/5 transition-colors duration-200">
                          <div className="p-4 flex gap-3">
                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${aviso.estado === 'atrasado' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                  <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                                    {aviso.titulo}
                                  </p>
                                  <span className="text-[10px] text-gray-600 whitespace-nowrap shrink-0">
                                    {new Date(aviso.fecha).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                              </div>
                              
                              {aviso.descripcion && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {aviso.descripcion}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                    {new Date(aviso.fecha).toLocaleDateString("es-AR")}
                                </span>
                                <button 
                                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100"
                                    onClick={(e) => handleMarcarLeido(e, aviso.id)}
                                >
                                    <FiCheckCircle className="w-3.5 h-3.5" />
                                    <span>Listo</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="p-2 border-t border-white/10 bg-white/[0.02]">
                <button 
                    className="w-full h-8 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors" 
                    onClick={fetchAvisos}
                >
                  Actualizar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle (Se mantiene pero se adapta al contexto oscuro) */}
        <div className="opacity-50 hover:opacity-100 transition-opacity">
            <ThemeToggle />
        </div>
      </div>
    </header>
  );
}