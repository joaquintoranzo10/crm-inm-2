import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // Nota: Asegúrate que tu endpoint sea correcto. 
        // Si tu base es /api/v1, quizás esto sea solo "avisos/"
        const { data } = await api.get("/avisos/"); 
        const list: unknown =
          Array.isArray(data) ? data : (data && (data.results ?? data.data));
        const safeArray: Aviso[] = Array.isArray(list) ? list : [];
        if (mounted) setAvisos(safeArray);
      } catch (e: any) {
        if (mounted)
          setError(e?.response?.data?.detail || e?.message || "Error cargando avisos");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const filtered = q
    ? avisos.filter(a =>
        (a.titulo || "").toLowerCase().includes(q.toLowerCase()) ||
        (a.descripcion || "").toLowerCase().includes(q.toLowerCase())
      )
    : avisos;

  return (
    // CONTENEDOR PRINCIPAL: Negro sólido #050505
    <div className="relative w-full min-h-screen bg-[#050505] text-white font-sans p-6 overflow-x-hidden">
      
      {/* --- FONDO FIJO (Grid sutil) --- */}
      <div className="fixed inset-0 -z-10 bg-[#050505]">
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
        </div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tighter mb-2">
                Recordatorios y <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Avisos</span>
            </h1>
            <p className="text-sm text-gray-400">
                Mantente al día con tus tareas pendientes y notificaciones del sistema.
            </p>
        </div>

        {/* BARRA DE BÚSQUEDA */}
        <div className="mb-6 relative">
          <input
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 pl-11 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-gray-500 transition-all"
            placeholder="Buscar por título o descripción..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {/* Icono de búsqueda */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* ESTADOS DE CARGA / ERROR */}
        {loading && (
            <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                <div className="text-sm text-gray-500">Cargando avisos...</div>
            </div>
        )}
        
        {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                {error}
            </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <p className="text-gray-500 text-sm">No se encontraron avisos.</p>
          </div>
        )}

        {/* LISTA DE AVISOS */}
        <ul className="space-y-3">
          {filtered.map((a) => (
            <li 
                key={a.id} 
                className="group p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all duration-200 shadow-sm"
            >
              <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-white text-lg tracking-tight mb-1">
                        {a.titulo || `Aviso #${a.id}`}
                    </div>
                    
                    {a.descripcion && (
                        <div className="text-sm text-gray-400 leading-relaxed">
                            {a.descripcion}
                        </div>
                    )}
                    
                    {/* Meta info */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {a.fecha && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                                <span>📅</span>
                                <span>{new Date(a.fecha).toLocaleString("es-AR", { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                        )}
                        
                        {a.estado && (
                            <span className={`px-2 py-1 rounded-lg border uppercase tracking-wider font-medium text-[10px]
                                ${a.estado === 'pendiente' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                  a.estado === 'atrasado' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
                            `}>
                                {a.estado}
                            </span>
                        )}

                        {a.creado_en && (
                            <span className="opacity-60">
                                Creado el {new Date(a.creado_en).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                  </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}