import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Search, Bell, Calendar, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

type Aviso = {
  id: number;
  titulo: string;
  descripcion?: string;
  fecha?: string;
  estado?: string;
  creado_en?: string;
};

export default function AvisosPage() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisoToDelete, setAvisoToDelete] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/avisos/");
        const list: unknown = Array.isArray(data) ? data : (data && (data.results ?? data.data));
        const safeArray: Aviso[] = Array.isArray(list) ? list : [];
        if (mounted) setAvisos(safeArray);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.detail || e?.message || "Error cargando avisos");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const handleMarcarListo = async (id: number) => {
    try {
      await api.patch(`/avisos/${id}/`, { estado: 'completado' });
      setAvisos(prev => prev.map(a => a.id === id ? { ...a, estado: 'completado' } : a));
      toast.success("¡Aviso marcado como completado!");
    } catch (error) {
      toast.error("No se pudo actualizar el aviso.");
    }
  };

  const confirmarEliminar = async () => {
    if (avisoToDelete === null) return;
    try {
      await api.delete(`/avisos/${avisoToDelete}/`);
      setAvisos(prev => prev.filter(a => a.id !== avisoToDelete));
      toast.success("Aviso eliminado.");
    } catch (error) {
      toast.error("No se pudo eliminar el aviso.");
    } finally {
      
      setAvisoToDelete(null); 
    }
  };

  const filtered = q ? avisos.filter(a => (a.titulo||"").toLowerCase().includes(q.toLowerCase())) : avisos;

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6 p-4">
      
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-base-clr">Avisos y Recordatorios</h1>
        <p className="text-base font-black leading-tight text-inherit">Gestiona las notificaciones de tu sistema.</p>
      </div>

      {/* Buscador */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="Buscar avisos..." 
          value={q} 
          onChange={e => setQ(e.target.value)}
          className="w-full h-12 pl-11 pr-4 rounded-xl outline-none transition-all 
            card-base font-bold placeholder-gray-500 
            focus:ring-2 focus:ring-blue-600/20 
            dark:font-normal dark:placeholder-gray-400"
        />
        <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-500 dark:text-gray-400" />
      </div>

      {/* Lista de Avisos */}
      <ul className="space-y-3">
        {filtered.map(a => (
          <li key={a.id} className="group relative overflow-hidden rounded-2xl transition-all card-base">
            <div className="relative p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                
                {/* Icono lateral */}
                <div className="shrink-0 rounded-full h-10 w-10 flex items-center justify-center 
                    bg-blue-50 text-blue-600 border border-blue-200 
                    dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                    <Bell className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      
                      {/* Textos */}
                      <div>
                        <h3 className="text-base font-black leading-tight text-inherit mb-1">
                            {a.titulo}
                        </h3>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-snug">
                            {a.descripcion || "Sin descripción."}
                        </p>
                        
                        {/*Fecha evento y Estado */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            {a.fecha && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/10">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{new Date(a.fecha).toLocaleString("es-AR", { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </div>
                            )}
                            
                            {a.estado && (
                                <span className={`px-2.5 py-1 rounded-md border uppercase tracking-wider font-bold text-[10px] 
                                    ${a.estado === 'pendiente' 
                                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' 
                                    : a.estado === 'atrasado' 
                                      ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20' 
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'}
                                `}>
                                    {a.estado}
                                </span>
                            )}
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">
                        {a.estado === 'pendiente' && (
                          <button 
                            onClick={() => handleMarcarListo(a.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Listo</span>
                          </button>
                        )}
                        <button 
                          onClick={() => setAvisoToDelete(a.id)} 
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sm:hidden">Eliminar</span>
                        </button>
                      </div>

                  </div>
                </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Estado vacío */}
      {!loading && !error && filtered.length === 0 && (
        <div className="py-16 text-center border border-dashed rounded-3xl 
            border-gray-300 bg-gray-50 
            dark:border-white/10 dark:bg-white/5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 
              bg-white text-gray-400 border border-gray-200 
              dark:bg-white/5 dark:text-gray-500 dark:border-white/10">
             <Bell className="h-6 w-6" />
          </div>
          <p className="text-black font-black dark:text-white">No hay avisos</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Estás al día con todo.</p>
        </div>
      )}
      
      {/* Cargando / Error */}
      {loading && <div className="text-center py-10 text-gray-500 animate-pulse font-bold">Cargando avisos...</div>}
      {error && <div className="text-center py-10 text-rose-500 font-bold">{error}</div>}

      {avisoToDelete !== null && (
        <ConfirmModal
          title="Eliminar aviso"
          message="¿Seguro que deseas eliminar este aviso permanentemente?"
          confirmLabel="Eliminar"
          confirmType="danger"
          onCancel={() => setAvisoToDelete(null)}
          onConfirm={confirmarEliminar}
        />
      )}

    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  confirmType = "primary",
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmType?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  async function go() {
    setWorking(true);
    await onConfirm();
    setWorking(false);
  }
  
  return (
    <div className="fixed inset-0 z-50">
      <div className="rc-modal-backdrop" onClick={onCancel} aria-hidden="true" />
      <div className="absolute inset-0 grid place-items-center px-4">
        <div
          className="rc-modal-panel w-full max-w-lg p-6"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-base-clr mb-2">{title}</h3>
          <div className="text-sm rc-muted">{message}</div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button 
              className="px-4 py-2 rounded-xl text-sm font-bold border border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all" 
              onClick={onCancel} 
              disabled={working}
            >
              Cancelar
            </button>
            <button
              className={
                confirmType === "danger"
                  ? "h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm disabled:opacity-60 transition-colors shadow-sm"
                  : "h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-60 transition-colors shadow-sm"
              }
              onClick={go}
              disabled={working}
            >
              {working ? "Procesando..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}