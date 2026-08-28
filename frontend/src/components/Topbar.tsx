import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheckCircle } from "react-icons/fi"; 
import ThemeToggle from "@/components/ThemeToggle"; 
import { api } from "@/lib/api"; 
import clsx from "clsx";

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
     
      const pendientes = data.filter((a) => a.estado !== "completado");
      setAvisos(pendientes);
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
    <header
      className={clsx(
        "sticky top-0 z-40 flex items-center justify-end px-6 py-4 transition-all duration-200",
        "bg-transparent" 
      )}
    >
      
      <div className="flex items-center gap-4">
        
        {/* Campana */}
        <div className="relative" ref={bellWrapRef}>
          <button
            className={clsx(
              "relative h-10 w-10 grid place-items-center rounded-xl border transition-all duration-200",
              openBell
                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40"
                : "bg-transparent border-gray-300/50 text-gray-600 hover:bg-gray-200 hover:border-gray-400 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:hover:border-white/40 dark:hover:text-white"
            )}
            onClick={() => setOpenBell((v) => !v)}
            title="Notificaciones"
          >

            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
            >
              <style>
                {`
                  @keyframes n-info-2 {
                    0%, 100% { transform: rotate(0deg); transform-origin: top center; }
                    10%, 90% { transform: rotate(2deg); }
                    20%, 40%, 60% { transform: rotate(-6deg); }
                    30%, 50%, 70% { transform: rotate(6deg); }
                    80% { transform: rotate(-2deg); }
                  }
                `}
              </style>
            
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M12 3.398a5 5 0 00-5 5v2c0 .758-.442 1.505-1.005 2.012A3 3 0 008 17.642h8a3 3 0 002.005-5.232C17.442 11.903 17 11.156 17 10.398v-2a5 5 0 00-5-5z"
              />
              
              <g style={{ animation: "n-info-2 1.5s cubic-bezier(.455,.03,.515,.955) both infinite" }}>
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  d="M14.39 20.312l-.043.01a9.715 9.715 0 01-4.67-.01"
                />
                
                <path
                  stroke={openBell ? "currentColor" : "#265BFF"} 
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  d="M12 7.923v3.206"
                />
                <circle cx="12" cy="13.245" r=".832" fill={openBell ? "currentColor" : "#265BFF"} />
              </g>
            </svg>

            {/* Contador de notificaciones */}
            {totalAvisos > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#18181b]">
                {totalAvisos > 9 ? "9+" : totalAvisos}
              </span>
            )}
          </button>

          {/* Dropdown Avisos */}
          {openBell && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 z-50 rounded-2xl shadow-2xl overflow-hidden ring-1 
              bg-[var(--surface)] border border-gray-200 ring-black/5
              dark:border-white/10 dark:ring-white/5"
            >
              
              <div className="px-4 py-3 border-b flex items-center justify-between
                bg-gray-50/50 border-gray-100
                dark:bg-white/5 dark:border-white/10"
              >
                <div className="text-sm font-semibold text-[var(--text-main)]">Notificaciones</div>
                <button className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors" onClick={goAvisos}>
                  Ver todas
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {loadingAvisos && <div className="px-4 py-8 text-center text-sm text-gray-500">Cargando...</div>}
                
                {errorAvisos && !loadingAvisos && (
                  <div className="px-4 py-4 text-sm text-rose-500 dark:text-rose-400 text-center">{errorAvisos}</div>
                )}
                
                {!loadingAvisos && !errorAvisos && avisos && (
                  <>
                    {avisos.length === 0 && (
                      <div className="px-4 py-12 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3
                          bg-gray-100 text-gray-400
                          dark:bg-white/5 dark:text-gray-600"
                        >
                            <FiBell className="text-xl" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Sin notificaciones</p>
                      </div>
                    )}
                    <ul className="divide-y divide-gray-100 dark:divide-white/5">
                      {avisos.map((aviso) => (
                        <li key={aviso.id} className="group transition-colors duration-200
                          hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <div className="p-4 flex gap-3">
                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${aviso.estado === 'atrasado' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                  <p className="text-sm font-medium truncate transition-colors
                                    text-[var(--text-main)]"
                                  >
                                    {aviso.titulo}
                                  </p>
                                  <span className="text-[10px] whitespace-nowrap shrink-0
                                    text-gray-400
                                    dark:text-gray-500"
                                  >
                                    {new Date(aviso.fecha).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                              </div>
                              
                              {aviso.descripcion && (
                                <p className="text-xs mt-0.5 line-clamp-2
                                  text-gray-500
                                  dark:text-gray-400"
                                >
                                  {aviso.descripcion}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded border
                                  bg-gray-100 text-gray-500 border-gray-200
                                  dark:bg-white/5 dark:text-gray-500 dark:border-white/5"
                                >
                                    {new Date(aviso.fecha).toLocaleDateString("es-AR")}
                                </span>
                                <button 
                                    className="text-xs flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100
                                      text-gray-400 hover:text-emerald-600
                                      dark:text-gray-500 dark:hover:text-emerald-400"
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

              <div className="p-2 border-t 
                bg-gray-50 border-gray-100
                dark:bg-white/[0.02] dark:border-white/10"
              >
                <button 
                    className="w-full h-8 rounded-lg text-xs font-medium transition-colors
                      text-gray-500 hover:text-gray-900 hover:bg-gray-200
                      dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5" 
                    onClick={fetchAvisos}
                >
                  Actualizar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="opacity-50 hover:opacity-100 transition-opacity">
            <ThemeToggle />
        </div>
      </div>
    </header>
  );
}