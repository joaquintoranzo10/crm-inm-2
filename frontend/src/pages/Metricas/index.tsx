import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { api } from "@/lib/api";

type LeadsPorEstado = { estado: string; total: number };
type PropiedadesStats = { estado: string; total: number };
type TopPropiedad = { id: number; codigo: string; titulo: string; total_eventos: number };

type ChartMetrics = {
  period: { year: number; month: number } | null;
  leads_por_estado: LeadsPorEstado[];
  leads_totales: number;
  leads_vendidos: number;
  leads_nuevos: number;
  leads_negociacion: number;
  leads_rechazados: number;
  propiedades_totales: number;
  propiedades_vendidas: number;
  propiedades_alquiladas: number;
  propiedades_stats: PropiedadesStats[];
  top_propiedades_venta: TopPropiedad[];
  top_propiedades_alquiler: TopPropiedad[];
};

const ESTADO_COLORS: Record<string, string> = {
  "Nuevo": "#3b82f6",
  "En negociación": "#f59e0b",
  "Rechazado": "#ef4444",
  "Vendido": "#10b981",
  "Sin estado": "#9ca3af",
};

const PROP_COLORS: Record<string, string> = {
  "Disp. Venta": "#3b82f6",
  "Disp. Alquiler": "#06b6d4",
  "Res. Venta": "#f59e0b",
  "Res. Alquiler": "#f97316",
  "Vendidas": "#10b981",
  "Alquiladas": "#8b5cf6",
};

const FALLBACK_COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];

function Card({ title, children }: any) {
  return (
    <section className="rounded-2xl p-6 shadow-sm card-base">
      <h2 className="text-lg font-black mb-5 pb-3 border-b border-gray-300 dark:border-white/20">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 card-base">
      <div className="absolute top-0 left-0 w-1 h-full opacity-70" style={{ background: accent }} />
      <div className="text-[10px] md:text-xs font-black uppercase tracking-wider opacity-70 mb-1 truncate">{label}</div>
      <div className="text-2xl md:text-3xl font-black">{value}</div>
    </div>
  );
}

function TopPropiedadesList({ items, emptyLabel }: { items: TopPropiedad[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="text-sm opacity-60 py-6 text-center">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((i) => i.total_eventos));
  return (
    <div className="space-y-3">
      {items.map((p, i) => (
        <div key={p.id}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-bold truncate pr-2">
              {i === 0 && "🏆 "}{p.titulo} <span className="opacity-50 font-normal">({p.codigo})</span>
            </span>
            <span className="font-black shrink-0">{p.total_eventos} {p.total_eventos === 1 ? "evento" : "eventos"}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${(p.total_eventos / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MetricasPage() {
  const [data, setData] = useState<ChartMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (year && month) { params.year = year; params.month = month; }
      const { data } = await api.get("/api/exportacion/metrics_charts/", { params });
      setData(data);
    } catch {
      setError("No se pudieron cargar las métricas.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pieData = useMemo(() => {
    if (!data) return [];
    return data.leads_por_estado.map((r) => ({ name: r.estado, value: r.total }));
  }, [data]);

  const propData = useMemo(() => {
    if (!data) return [];
    return data.propiedades_stats.filter(r => r.total > 0).map((r) => ({ name: r.estado, value: r.total }));
  }, [data]);

  const isDark = document.documentElement.classList.contains("dark");
  const axisColor = isDark ? "#a1a1aa" : "#52525b";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Métricas</h1>
          <p className="text-sm font-medium opacity-70">Leads, operaciones concretadas y propiedades más elegidas.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rc-input"
            value={year}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Todo el histórico</option>
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {year !== "" && (
            <select
              className="rc-input"
              value={month}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Mes</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          <button
            onClick={load}
            className="h-10 px-4 rounded-lg text-sm font-bold border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-all"
          >
            Aplicar
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 rounded-xl border px-4 py-3 text-sm bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800">
          {error}
        </div>
      )}

      {loading && <p className="px-4 text-sm opacity-60">Cargando métricas...</p>}

      {!loading && data && (
        <>
          <div className="space-y-6">
            {/* Sección Leads */}
            <div>
              <h3 className="text-lg font-bold mb-3 px-1 text-gray-800 dark:text-gray-200">Rendimiento de Leads</h3>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard label="Totales" value={data.leads_totales} accent="#6b7280" />
                <StatCard label="Nuevos" value={data.leads_nuevos} accent="#3b82f6" />
                <StatCard label="En Negociación" value={data.leads_negociacion} accent="#f59e0b" />
                <StatCard label="Vendidos" value={data.leads_vendidos} accent="#10b981" />
                <StatCard label="Rechazados" value={data.leads_rechazados} accent="#ef4444" />
              </div>
            </div>

            {/* Sección Propiedades */}
            <div>
              <h3 className="text-lg font-bold mb-3 px-1 text-gray-800 dark:text-gray-200">Inventario y Cierres</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Total en Catálogo" value={data.propiedades_totales} accent="#6b7280" />
                <StatCard label="Total Vendidas" value={data.propiedades_vendidas} accent="#10b981" />
                <StatCard label="Total Alquiladas" value={data.propiedades_alquiladas} accent="#8b5cf6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Leads por estado">
              {pieData.length === 0 ? (
                <p className="text-sm opacity-60 py-10 text-center">No hay leads en este periodo.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                          {pieData.map((entry, i) => (
                            <Cell key={entry.name} fill={ESTADO_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={data.leads_por_estado} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                        <XAxis type="number" allowDecimals={false} stroke={axisColor} fontSize={12} />
                        <YAxis type="category" dataKey="estado" width={110} stroke={axisColor} fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                          {data.leads_por_estado.map((entry, i) => (
                            <Cell key={entry.estado} fill={ESTADO_COLORS[entry.estado] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Estado de Propiedades">
              {propData.length === 0 ? (
                <p className="text-sm opacity-60 py-10 text-center">No hay propiedades en este periodo.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={propData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                          {propData.map((entry, i) => (
                            <Cell key={entry.name} fill={PROP_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={data.propiedades_stats} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                        <XAxis type="number" allowDecimals={false} stroke={axisColor} fontSize={12} />
                        <YAxis type="category" dataKey="estado" width={110} stroke={axisColor} fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                          {data.propiedades_stats.map((entry, i) => (
                            <Cell key={entry.estado} fill={PROP_COLORS[entry.estado] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Propiedad más elegida — Venta">
              <TopPropiedadesList items={data.top_propiedades_venta} emptyLabel="Todavía no hay visitas a propiedades en venta." />
            </Card>
            <Card title="Propiedad más elegida — Alquiler">
              <TopPropiedadesList items={data.top_propiedades_alquiler} emptyLabel="Todavía no hay visitas a propiedades en alquiler." />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}