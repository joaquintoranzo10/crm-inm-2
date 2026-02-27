import { useState } from "react";

type Props = {
  onChange: (filters: { date?: string; from?: string; to?: string; types?: string }) => void;
};

export default function TopFilters({ onChange }: Props) {
  const [active, setActive] = useState<"today" | "tomorrow" | "week" | null>(null);
  const [tipo, setTipo] = useState<string>("");

  function handleQuickFilter(key: "today" | "tomorrow" | "week") {
    setActive(key);
    const today = new Date();
    if (key === "today") {
      const d = today.toISOString().slice(0, 10);
      onChange({ date: d, types: tipo || undefined });
    } else if (key === "tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const d = tomorrow.toISOString().slice(0, 10);
      onChange({ date: d, types: tipo || undefined });
    } else if (key === "week") {
      const start = new Date(today);
      const end = new Date(today);
      end.setDate(today.getDate() + 7);
      onChange({
        from: start.toISOString().slice(0, 10),
        to: end.toISOString().slice(0, 10),
        types: tipo || undefined,
      });
    }
  }

  function handleTipoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setTipo(val);
    if (active === "today") {
      const d = new Date().toISOString().slice(0, 10);
      onChange({ date: d, types: val || undefined });
    } else if (active === "tomorrow") {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      const d = t.toISOString().slice(0, 10);
      onChange({ date: d, types: val || undefined });
    } else if (active === "week") {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      onChange({
        from: start.toISOString().slice(0, 10),
        to: end.toISOString().slice(0, 10),
        types: val || undefined,
      });
    } else {
      onChange({ types: val || undefined });
    }
  }

  // Estilos "Glass" unificados
  const btnBase = "px-4 h-9 rounded-xl border text-sm font-medium transition-all duration-200";
  const btnInactive = "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white";
  const btnActive = "border-blue-500/50 bg-blue-600 text-white shadow-lg shadow-blue-900/20";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <button className={`${btnBase} ${active === "today" ? btnActive : btnInactive}`} onClick={() => handleQuickFilter("today")}>
        Hoy
      </button>
      <button className={`${btnBase} ${active === "tomorrow" ? btnActive : btnInactive}`} onClick={() => handleQuickFilter("tomorrow")}>
        Mañana
      </button>
      <button className={`${btnBase} ${active === "week" ? btnActive : btnInactive}`} onClick={() => handleQuickFilter("week")}>
        Esta semana
      </button>

      <div className="w-full sm:w-auto sm:ml-auto relative group">
        <select
            className="appearance-none w-full sm:w-auto h-9 pl-4 pr-8 rounded-xl border border-white/10 bg-white/5 text-sm text-gray-300 focus:ring-2 focus:ring-blue-500/50 focus:bg-black outline-none cursor-pointer hover:bg-white/10 transition-colors"
            value={tipo}
            onChange={handleTipoChange}
        >
            <option value="" className="bg-[#050505] text-gray-300">Todos</option>
            <option value="Reunion" className="bg-[#050505] text-gray-300">Reuniones</option>
            <option value="Llamada" className="bg-[#050505] text-gray-300">Llamadas</option>
            <option value="Visita" className="bg-[#050505] text-gray-300">Visitas</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    </div>
  );
}