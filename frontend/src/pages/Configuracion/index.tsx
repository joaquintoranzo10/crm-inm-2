import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api"; 

// =============================================
// Helpers
// =============================================
function fmt(n: number) {
  return n.toString().padStart(2, "0");
}

function thisYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =============================================
// Types
// =============================================
type Metrics = {
  year: number;
  month: number;
  leads_mes: number;
  ventas_mes: number;
  conversion_pct: number;
};

type ImportResult = {
  resource: string;
  dry_run: boolean;
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
};

type MeResponse = {
  id: number;
  nombre?: string;
  apellido?: string;
  email: string;
  telefono?: string;
  dni?: string;
  reminder_every_days?: number;
};

// =============================================
// UI Primitivos (Estilo Dark)
// =============================================
function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-sm ${className}`}
    >
      <h2 className="text-lg font-bold text-white mb-5 border-b border-white/5 pb-2">{title}</h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">
      {children}
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  let style = "";
  if (variant === "primary") {
    style = "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20";
  } else if (variant === "danger") {
    style = "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20";
  } else {
    style = "bg-white/5 border border-white/10 hover:bg-white/10 text-white";
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`h-10 px-5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${style}`}
    >
      {children}
    </button>
  );
}

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <input
    ref={ref}
    {...props}
    className={`h-10 w-full rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-gray-600 transition-all ${
      props.className || ""
    }`}
  />
));
Input.displayName = "Input";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>((props, ref) => (
  <select
    ref={ref}
    {...props}
    className={`h-10 w-full rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer ${
      props.className || ""
    }`}
  >
      {props.children}
  </select>
));
Select.displayName = "Select";

function Alert({
  kind = "info",
  children,
}: {
  kind?: "info" | "error" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    error: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  } as const;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}

// =============================================
// Error Boundary
// =============================================
class Boundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; msg?: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, msg: String(err?.message || err) };
  }
  componentDidCatch(err: any, info: any) {
    console.error("UI crash:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto mt-10 px-4">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 p-6">
            <b className="block mb-2 text-lg">Ocurrió un error en la UI</b>
            <div className="text-sm opacity-80">{this.state.msg}</div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

// =============================================
// Page Component
// =============================================
export default function ConfiguracionPage() {
  const now = thisYearMonth();
  const [year, setYear] = useState<number>(now.year);
  const [month, setMonth] = useState<number>(now.month);
  
  // Export
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [resLeads, setResLeads] = useState(true);
  const [resProps, setResProps] = useState(true);
  const [resEventos, setResEventos] = useState(false);
  const [estadoProp, setEstadoProp] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Import
  const [importRes, setImportRes] = useState<ImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResource, setImportResource] =
    useState<"leads" | "propiedades" | "eventos">("propiedades");
  const [dryRun, setDryRun] = useState(true);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Password change
  const [pwdCur, setPwdCur] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdNew2, setPwdNew2] = useState("");
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Delete account
  const [confirmText, setConfirmText] = useState("");
  const [delPwd, setDelPwd] = useState("");
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  // Preferencias
  const [reminderDays, setReminderDays] = useState<number>(3);
  const [prefLoading, setPrefLoading] = useState<boolean>(false);
  const [prefSaving, setPrefSaving] = useState<boolean>(false);
  const [prefMsg, setPrefMsg] = useState<string | null>(null);
  const [prefErr, setPrefErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadMe() {
      setPrefLoading(true);
      setPrefErr(null);
      try {
        const { data } = await api.get<MeResponse>("/api/usuarios/me/");
        if (!mounted) return;
        const v = data?.reminder_every_days;
        if (typeof v === "number" && v > 0) setReminderDays(v);
      } catch (e: any) {
        if (!mounted) return;
        setPrefErr(e?.response?.data?.detail || e?.message || "No se pudo cargar tu preferencia.");
      } finally {
        if (mounted) setPrefLoading(false);
      }
    }
    loadMe();
    return () => {
      mounted = false;
    };
  }, []);

  async function savePrefs() {
    setPrefSaving(true);
    setPrefMsg(null);
    setPrefErr(null);
    try {
      const value = Number(reminderDays);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Ingresá un número válido (p. ej. 3, 5 o 7).");
      await api.patch("/api/usuarios/me/", { reminder_every_days: value });
      setPrefMsg("Preferencia guardada ✅");
    } catch (e: any) {
      setPrefErr(e?.response?.data?.detail || e?.message || "No se pudo guardar la preferencia.");
    } finally {
      setPrefSaving(false);
    }
  }

  // ================= Export =================
  async function handleExport() {
    setExportLoading(true);
    setExportError(null);
    try {
      const resources = [
        resLeads && "leads",
        resProps && "propiedades",
        resEventos && "eventos",
      ].filter(Boolean);
      if (resources.length === 0)
        throw new Error("Seleccioná al menos un recurso");

      const payload = {
        format,
        resources,
        filters: {
          year,
          month,
          estado_propiedad: estadoProp.length ? estadoProp : undefined,
        },
      };

      const url = "/api/exportacion/export/";
      if (format === "csv") {
        const { data } = await api.post(url, payload, { responseType: "blob" });
        const fname = `export_${year}_${fmt(month)}.csv`;
        downloadBlob(data, fname);
      } else {
        const { data } = await api.post(url, payload, {
          responseType: "json",
        });
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const fname = `export_${year}_${fmt(month)}.json`;
        downloadBlob(blob, fname);
      }
    } catch (e: any) {
      setExportError(
        e?.response?.data?.detail || e?.message || "Error exportando"
      );
    } finally {
      setExportLoading(false);
    }
  }

  async function handleMetrics() {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const { data } = await api.get<Metrics>(`/api/exportacion/metrics/`, {
        params: { year, month },
      });
      setMetrics(data);
    } catch (e: any) {
      setMetricsError(
        e?.response?.data?.detail || e?.message || "Error obteniendo métricas"
      );
    } finally {
      setMetricsLoading(false);
    }
  }

  // ================= Import =================
  async function handleImport() {
    setImportLoading(true);
    setImportError(null);
    setImportRes(null);
    try {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Seleccioná un archivo CSV o JSON");
      const form = new FormData();
      form.append("file", file);
      form.append("resource", importResource);
      form.append("dry_run", String(dryRun));
      const { data } = await api.post<ImportResult>(
        "/api/exportacion/import/",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setImportRes(data);
    } catch (e: any) {
      setImportError(
        e?.response?.data?.detail || e?.message || "Error importando"
      );
    } finally {
      setImportLoading(false);
    }
  }

  // ================= Password change =================
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    setPwdLoading(true);
    try {
      if (pwdNew !== pwdNew2)
        throw new Error("Las contraseñas nuevas no coinciden");
      await api.post("/api/usuarios/me/change_password/", {
        current_password: pwdCur,
        new_password: pwdNew,
        re_new_password: pwdNew2,
      });
      setPwdMsg("Contraseña actualizada ✅");
      setPwdCur("");
      setPwdNew("");
      setPwdNew2("");
    } catch (e: any) {
      setPwdMsg(
        e?.response?.data?.detail ||
          e?.message ||
          "Error actualizando contraseña"
      );
    } finally {
      setPwdLoading(false);
    }
  }

  // ================= Delete account =================
  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDelMsg(null);
    setDelLoading(true);
    try {
      await api.post("/api/usuarios/me/delete/", {
        current_password: delPwd,
        confirm_text: confirmText,
      });
      setDelMsg("Cuenta eliminada. Cerrando sesión...");
      localStorage.clear();
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (e: any) {
      setDelMsg(
        e?.response?.data?.detail || e?.message || "No se pudo eliminar la cuenta"
      );
    } finally {
      setDelLoading(false);
    }
  }

  return (
    // CONTENEDOR PRINCIPAL: Negro sólido
    <div className="min-h-screen bg-[#050505] text-white p-6 overflow-x-hidden font-sans relative">
      
      {/* Fondo Fijo Grid */}
      <div className="fixed inset-0 -z-10 bg-[#050505]">
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
        </div>
      </div>

      <Boundary>
        <div className="max-w-5xl mx-auto space-y-8 relative z-10">
          
          {/* Header */}
          <div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">Configuración</h1>
            <p className="text-sm text-gray-400">Administra tus preferencias, exportaciones y seguridad.</p>
          </div>

          {/* Preferencias de recordatorios */}
          <Section title="Preferencias de recordatorios">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div>
                <Label>Recordarme cada (días)</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                />
                <div className="mt-2 text-xs text-gray-500">
                  Recomendado: <b>3</b>, <b>5</b> o <b>7</b> días.
                </div>
              </div>
              <div className="flex items-end gap-3">
                <Button onClick={savePrefs} disabled={prefSaving || prefLoading}>
                  {prefSaving ? "Guardando…" : "Guardar preferencia"}
                </Button>
                {prefLoading && (
                  <span className="text-sm text-gray-500 pb-2">Cargando…</span>
                )}
              </div>
            </div>
            {prefMsg && <div className="mt-4"><Alert kind="success">{prefMsg}</Alert></div>}
            {prefErr && <div className="mt-4"><Alert kind="error">{prefErr}</Alert></div>}
          </Section>

          {/* Exportar datos */}
          <Section title="Exportar datos (CSV/JSON)">
            <Row>
              <div className="space-y-2">
                <Label>Periodo</Label>
                <div className="flex items-center gap-3">
                  <Select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                  >
                    {useMemo(() => {
                      const y = new Date().getFullYear();
                      return Array.from({ length: 7 }, (_, i) => y - 3 + i);
                    }, []).map((y) => (
                      <option key={y} value={y} className="bg-gray-900">{y}</option>
                    ))}
                  </Select>
                  <Select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m} className="bg-gray-900">{fmt(m)}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="fmt"
                      checked={format === "csv"}
                      onChange={() => setFormat("csv")}
                      className="accent-blue-500"
                    />
                    CSV
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="fmt"
                      checked={format === "json"}
                      onChange={() => setFormat("json")}
                      className="accent-blue-500"
                    />
                    JSON
                  </label>
                </div>
              </div>
            </Row>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Label>Recursos a exportar</Label>
                <div className="mt-3 space-y-2 text-sm text-gray-300">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={resLeads}
                      onChange={(e) => setResLeads(e.target.checked)}
                      className="accent-blue-500"
                    />
                    Leads
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={resProps}
                      onChange={(e) => setResProps(e.target.checked)}
                      className="accent-blue-500"
                    />
                    Propiedades
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={resEventos}
                      onChange={(e) => setResEventos(e.target.checked)}
                      className="accent-blue-500"
                    />
                    Eventos
                  </label>
                </div>
              </div>
              
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <Label>Filtro propiedad (opcional)</Label>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-300">
                  {["disponible", "vendido", "reservado"].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={estadoProp.includes(opt)}
                        onChange={(e) => {
                          setEstadoProp((prev) =>
                            e.target.checked
                              ? [...prev, opt]
                              : prev.filter((x) => x !== opt)
                          );
                        }}
                        className="accent-blue-500"
                      />
                      <span className="capitalize">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-end gap-3">
                <Button onClick={handleExport} disabled={exportLoading}>
                  {exportLoading ? "Exportando…" : "Exportar Selección"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleMetrics}
                  disabled={metricsLoading}
                >
                  {metricsLoading ? "Cargando…" : "Ver métricas rápidas"}
                </Button>
              </div>
            </div>

            {exportError && <div className="mt-4"><Alert kind="error">{exportError}</Alert></div>}
            
            {metrics && (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                <div className="font-bold text-blue-400 mb-3 uppercase tracking-wide">
                  Métricas {metrics.year}-{fmt(metrics.month)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-white/5 p-3 border border-white/5">
                    <div className="text-gray-400 text-xs uppercase">Leads del mes</div>
                    <div className="text-2xl font-bold text-white">{metrics.leads_mes}</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 border border-white/5">
                    <div className="text-gray-400 text-xs uppercase">Ventas del mes</div>
                    <div className="text-2xl font-bold text-white">{metrics.ventas_mes}</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 border border-white/5">
                    <div className="text-gray-400 text-xs uppercase">% Conversión</div>
                    <div className="text-2xl font-bold text-white">{metrics.conversion_pct}%</div>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Importar */}
          <Section title="Importar datos (CSV/JSON)">
            <Row>
              <div className="space-y-2">
                <Label>Recurso destino</Label>
                <Select
                  value={importResource}
                  onChange={(e) =>
                    setImportResource(e.target.value as any)
                  }
                >
                  <option value="leads" className="bg-gray-900">Leads</option>
                  <option value="propiedades" className="bg-gray-900">Propiedades</option>
                  <option value="eventos" className="bg-gray-900">Eventos</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Archivo</Label>
                <Input ref={fileRef} type="file" accept=".csv, .json" className="file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500" />
              </div>
            </Row>
            <div className="mt-5 flex items-center gap-4 border-t border-white/5 pt-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="accent-blue-500 w-4 h-4"
                />
                <span>Modo Prueba (Dry-run) <span className="text-gray-500 text-xs ml-1">- No guarda cambios</span></span>
              </label>
              <div className="ml-auto">
                  <Button onClick={handleImport} disabled={importLoading}>
                    {importLoading ? "Procesando…" : "Iniciar Importación"}
                  </Button>
              </div>
            </div>
            
            {importError && <div className="mt-4"><Alert kind="error">{importError}</Alert></div>}
            
            {importRes && (
              <div className="mt-5 space-y-3 text-sm">
                <Alert kind={importRes.errors.length ? "info" : "success"}>
                  <div className="font-bold mb-1 uppercase tracking-wide text-xs opacity-80">
                    Resultado ({importRes.dry_run ? "PREVIEW" : "APLICADO"})
                  </div>
                  <div className="flex gap-4">
                    <span>Creados: <b>{importRes.created}</b></span>
                    <span>Actualizados: <b>{importRes.updated}</b></span>
                    <span>Errores: <b>{importRes.errors.length}</b></span>
                  </div>
                </Alert>
                {importRes.errors.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                    <div className="px-4 py-2 bg-white/5 text-xs font-bold text-gray-400 uppercase">Detalle de errores</div>
                    <div className="max-h-40 overflow-auto p-0">
                        <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-gray-500">
                            <tr>
                            <th className="px-4 py-2 w-16">Fila</th>
                            <th className="px-4 py-2">Error</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {importRes.errors.slice(0, 100).map((e, i) => (
                            <tr key={i} className="hover:bg-white/5">
                                <td className="px-4 py-2 font-mono text-gray-400">{e.row}</td>
                                <td className="px-4 py-2 text-rose-300">{e.error}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Seguridad */}
          <Section title="Seguridad: Cambiar contraseña">
            <form
              onSubmit={handleChangePassword}
              className="grid grid-cols-1 md:grid-cols-3 gap-5"
            >
              <div>
                <Label>Contraseña actual</Label>
                <Input
                  type="password"
                  value={pwdCur}
                  onChange={(e) => setPwdCur(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  required
                  placeholder="Nueva clave"
                />
              </div>
              <div>
                <Label>Repetir nueva</Label>
                <Input
                  type="password"
                  value={pwdNew2}
                  onChange={(e) => setPwdNew2(e.target.value)}
                  required
                  placeholder="Confirmar"
                />
              </div>
              <div className="md:col-span-3 flex items-center gap-3 pt-2">
                <Button type="submit" disabled={pwdLoading}>
                  {pwdLoading ? "Guardando…" : "Actualizar contraseña"}
                </Button>
                {pwdMsg && (
                  <span className="text-sm text-emerald-400 font-medium animate-pulse">
                    {pwdMsg}
                  </span>
                )}
              </div>
            </form>
          </Section>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-rose-900/30 bg-rose-950/10 p-6">
            <h2 className="text-lg font-bold text-rose-400 mb-2">Zona de Peligro</h2>
            <p className="text-sm text-rose-300/70 mb-5">Esta acción es irreversible. Se eliminarán todos tus datos asociados.</p>
            
            <form
              onSubmit={handleDeleteAccount}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end"
            >
              <div>
                <Label>Escribí <span className="text-white">ELIMINAR</span></Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="ELIMINAR"
                  className="border-rose-500/30 focus:ring-rose-500/50"
                />
              </div>
              <div>
                <Label>Contraseña actual</Label>
                <Input
                  type="password"
                  value={delPwd}
                  onChange={(e) => setDelPwd(e.target.value)}
                  className="border-rose-500/30 focus:ring-rose-500/50"
                />
              </div>
              <div>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={delLoading || confirmText !== "ELIMINAR"}
                >
                  {delLoading ? "Eliminando…" : "Eliminar mi cuenta"}
                </Button>
              </div>
              
              {delMsg && (
                <div className="md:col-span-3 mt-2">
                  <Alert kind={delMsg.includes("eliminada") ? "success" : "error"}>
                    {delMsg}
                  </Alert>
                </div>
              )}
            </form>
          </div>

        </div>
      </Boundary>
    </div>
  );
}