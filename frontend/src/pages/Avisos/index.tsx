import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Search, Bell, Calendar } from "lucide-react";

type Aviso = { id: number; titulo: string; descripcion?: string; fecha?: string; estado?: string; creado_en?: string; };

export default function AvisosPage() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const filtered = q ? avisos.filter(a => (a.titulo||"").toLowerCase().includes(q.toLowerCase())) : avisos;

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6 p-4">
      
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-base-clr">Avisos y Recordatorios</h1>
        <p className="text-base font-black leading-tight text-inherit">Notificaciones del sistema.</p>
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
              
              <div className="relative p-5 flex gap-4 items-start">
                  {/* Icono lateral */}
                  <div className="shrink-0 rounded-full h-10 w-10 flex items-center justify-center
                      bg-blue-50 text-blue-600 border border-blue-200
                      dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                      <Bell className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                        {/* Título */}
                        <h3 className="text-base font-black leading-tight text-inherit">
                            {a.titulo}
                        </h3>
                        {/* Fecha relativa */}
                        {a.creado_en && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 shrink-0">
                                {new Date(a.creado_en).toLocaleDateString("es-AR")}
                            </span>
                        )}
                    </div>
                    
                    {/* Descripción*/}
                    <p className="text-base font-black leading-tight text-inherit">
                        {a.descripcion || "Sin descripción"}
                    </p>

                    {/* Footer del aviso (Fecha evento y Estado) */}
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
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
      {loading && <div className="text-center py-10 text-gray-500 animate-pulse">Cargando avisos...</div>}
      {error && <div className="text-center py-10 text-rose-500 font-bold">{error}</div>}

    </div>
  );
}