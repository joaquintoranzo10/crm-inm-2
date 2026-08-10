import React, { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { FiCheckCircle } from "react-icons/fi";

function Section({ title, children }: any) {
  return (
    <section className="rounded-2xl p-6 shadow-sm transition-all duration-200 card-base"> 
      <h2 className="text-lg font-black mb-5 pb-3 border-b border-gray-300 dark:border-white/20">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children, className }: any) {
  return (
    <label 
      
      className={`text-xs font-black uppercase tracking-wider mb-1.5 block ml-1 ${className || ""}`}
    >
      {children}
    </label>
  );
}

const Input = React.forwardRef((props: any, ref: any) => {
  return (
    <input
      {...props}
      ref={ref}
      className={`rc-input ${props.className || ""}`}
    />
  );
});

function Select(props: any) {
  return (
    <select {...props} className={`rc-input cursor-pointer ${props.className || ""}`}>
      {props.children}
    </select>
  );
}

function Button({ children, onClick, variant = "primary", disabled, type = "button" }: any) {
  const baseClass = "h-10 px-4 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

  const variants: any = {

    primary: "border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white",

    danger: "border border-rose-500 text-rose-600 dark:text-rose-400 dark:border-rose-500 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white",
    
    ghost: "text-gray-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 border border-transparent shadow-none"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      type={type} 
      className={`${baseClass} ${variants[variant] || variants.primary}`}
    >
      {children}
    </button>
  );
}

function Alert({ kind = "info", children }: any) {
    const styles: any = {
      info: "bg-blue-50 text-blue-900 border-blue-300 font-medium dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800",
      error: "bg-rose-50 text-rose-900 border-rose-300 font-medium dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800",
      success: "bg-emerald-50 text-emerald-900 border-emerald-300 font-medium dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800",
    };
    return <div className={`rounded-xl border px-4 py-3 text-sm ${styles[kind]}`}>{children}</div>;
}


function thisYearMonth() { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; }

export default function ConfiguracionPage() {
  const now = thisYearMonth();
  const [year, setYear] = useState(now.year);
  const [month, setMonth] = useState(now.month);
  const [reminderDays, setReminderDays] = useState(3);
  const [prefSaving, setPrefSaving] = useState(false);
  const [format, setFormat] = useState<"csv"|"json">("csv");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResources, setExportResources] = useState<string[]>(["leads", "propiedades", "eventos"]);
  const [metrics, setMetrics] = useState<any>(null); 
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [importResource] = useState("leads");
  const [dryRun, setDryRun] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importRes, setImportRes] = useState<any>(null); 
  const [pwdCur, setPwdCur] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdNew2, setPwdNew2] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [delPwd, setDelPwd] = useState("");
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const optionStyle = { backgroundColor: "var(--surface)", color: "var(--text-main)" };
  const [showSuccess, setShowSuccess] = useState(false);


  useEffect(() => {
    api.get("/api/usuarios/me/").then(({data}:any) => { if(data.reminder_every_days) setReminderDays(data.reminder_every_days); }).catch(()=>{});
  }, []);

  const savePrefs = async () => {
    setPrefSaving(true);
    setShowSuccess(false); 
    try {
      await api.patch("/api/usuarios/me/", {
        reminder_every_days: Number(reminderDays),
      });
      
 
      setShowSuccess(true);
      
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch {
      alert("Error al guardar la preferencia");
    } finally {
      setPrefSaving(false);
    }
  };

  const toggleExportResource = (r: string) => {
    setExportResources((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportError(null);
    if (exportResources.length === 0) {
      setExportError("Elegí al menos un recurso para exportar");
      setExportLoading(false);
      return;
    }
    try {
      const res = await api.post(
        "/api/exportacion/export/",
        { format, resources: exportResources, filters: { year, month } },
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${year}_${String(month).padStart(2, "0")}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("No se pudo generar la exportación. Probá de nuevo.");
    } finally {
      setExportLoading(false);
    }
  };
  const handleMetrics = async () => { setMetricsLoading(true); try{ const {data} = await api.get("/api/exportacion/metrics/", {params:{year,month}}); setMetrics(data); }catch{ }finally{ setMetricsLoading(false); } };
  const [importError, setImportError] = useState<string | null>(null);
  const handleImport = async () => {
    setImportLoading(true);
    setImportError(null);
    try {
      const f = fileRef.current?.files?.[0];
      if (!f) { setImportError("Seleccioná un archivo primero"); return; }
      const fd = new FormData();
      fd.append("file", f);
      fd.append("resource", importResource);
      fd.append("dry_run", String(dryRun));
      const { data } = await api.post("/api/exportacion/import/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportRes(data);
    } catch (e: any) {
      setImportError(e?.response?.data?.detail || "No se pudo importar el archivo");
    } finally {
      setImportLoading(false);
    }
  };
  const handleChangePassword = async (e:any) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdError(null);
    try {
      await api.post("/api/usuarios/me/change_password/", { current_password: pwdCur, new_password: pwdNew, re_new_password: pwdNew2 });
      setPwdCur(""); setPwdNew(""); setPwdNew2("");
      setPwdSuccess(true);
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err: any) {
      setPwdError(err?.response?.data?.detail || "No se pudo cambiar la contraseña");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteSubmit = (e: any) => {
    e.preventDefault();
    setDelError(null);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    setDelLoading(true);
    setDelError(null);
    try {
      await api.post("/api/usuarios/me/delete/", { current_password: delPwd, confirm_text: confirmText });
      window.location.href = "/";
    } catch (err: any) {
      setDelError(err?.response?.data?.detail || "No se pudo eliminar la cuenta");
      setShowDeleteConfirm(false);
    } finally {
      setDelLoading(false);
    }
  };

   return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      
      <div className="p-4">
        <h1 className="text-3xl font-black tracking-tighter">Configuración</h1>
        <p className="text-sm font-medium opacity-70">Administra tus preferencias y seguridad.</p>
      </div>

      <Section title="Preferencias de recordatorios">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            <div>
              <Label>Recordarme cada (días)</Label>
              <Input 
                type="number" 
                min={1} 
                value={reminderDays} 
                onChange={(e:any) => setReminderDays(e.target.value)} 
              />
            </div>
            
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              
              {showSuccess && (
                <div className="animate-in fade-in slide-in-from-right-5 duration-300 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm
                  bg-emerald-50 border-emerald-200 text-emerald-700 
                  dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                >
                  <FiCheckCircle className="text-lg shrink-0" />
                  <span className="text-sm font-medium">Actualizado con éxito</span>
                </div>
              )}

              <Button onClick={savePrefs} disabled={prefSaving}>
                {prefSaving ? "Guardando..." : "Guardar preferencia"}
              </Button>
            </div>
          </div>
        </Section>

      <Section title="Exportar datos">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
                <Label>Periodo</Label>
                <div className="flex gap-2">
                  <Select value={year} onChange={(e:any)=>setYear(Number(e.target.value))}>
                    {[2023,2024,2025,2026].map(y=> (
                      <option key={y} value={y} style={optionStyle}>{y}</option>
                    ))}
                  </Select>
                  <Select value={month} onChange={(e:any)=>setMonth(Number(e.target.value))}>
                    {[...Array(12)].map((_,i)=> (
                      <option key={i+1} value={i+1} style={optionStyle}>{i+1}</option>
                    ))}
                  </Select>
                </div>
            </div>
            <div>
                <Label>Formato</Label>
                <div className="flex gap-4 pt-3 text-sm font-bold">
                    <label className="flex gap-2"><input type="radio" className="accent-blue-600" checked={format==="csv"} onChange={()=>setFormat("csv")} /> CSV</label>
                    <label className="flex gap-2"><input type="radio" className="accent-blue-600" checked={format==="json"} onChange={()=>setFormat("json")} /> JSON</label>
                </div>
            </div>
        </div>
        <div className="mt-5">
            <Label>Qué exportar</Label>
            <div className="flex flex-wrap gap-4 pt-2 text-sm font-bold">
                <label className="flex gap-2 items-center">
                    <input type="checkbox" className="accent-blue-600" checked={exportResources.includes("leads")} onChange={()=>toggleExportResource("leads")} /> Leads
                </label>
                <label className="flex gap-2 items-center">
                    <input type="checkbox" className="accent-blue-600" checked={exportResources.includes("propiedades")} onChange={()=>toggleExportResource("propiedades")} /> Propiedades
                </label>
                <label className="flex gap-2 items-center">
                    <input type="checkbox" className="accent-blue-600" checked={exportResources.includes("eventos")} onChange={()=>toggleExportResource("eventos")} /> Eventos
                </label>
                <label className="flex gap-2 items-center ml-auto opacity-70">
                    <input
                      type="checkbox"
                      className="accent-blue-600"
                      checked={exportResources.length === 3}
                      onChange={()=>setExportResources(exportResources.length === 3 ? [] : ["leads","propiedades","eventos"])}
                    /> Todos
                </label>
            </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-300 dark:border-white/10 flex justify-end gap-3">
             <Button variant="ghost" onClick={handleMetrics} disabled={metricsLoading}>Ver métricas</Button>
             <Button onClick={handleExport} disabled={exportLoading}>{exportLoading ? "Exportando..." : "Exportar"}</Button>
        </div>
        {exportError && <div className="mt-4"><Alert kind="error">{exportError}</Alert></div>}
        {metrics && (
             <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                 <div className="p-4 rounded-xl card-base border-t-2 border-t-blue-500 shadow-sm">
                     <div className="text-[10px] font-black uppercase opacity-70 mb-1">Eventos (Mes)</div>
                     <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{metrics.eventos_mes}</div>
                 </div>
                 <div className="p-4 rounded-xl card-base border-t-2 border-t-emerald-500 shadow-sm">
                     <div className="text-[10px] font-black uppercase opacity-70 mb-1">Propiedades (Mes)</div>
                     <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{metrics.propiedades_mes}</div>
                 </div>
                 <div className="p-4 rounded-xl card-base border-t-2 border-t-amber-500 shadow-sm">
                     <div className="text-[10px] font-black uppercase opacity-70 mb-1">Leads Pendientes</div>
                     <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{metrics.leads_pendientes}</div>
                 </div>
                 <div className="p-4 rounded-xl card-base border-t-2 border-t-purple-500 shadow-sm">
                     <div className="text-[10px] font-black uppercase opacity-70 mb-1">Cierres (Mes)</div>
                     <div className="text-3xl font-black text-purple-600 dark:text-purple-400">{metrics.ventas_mes}</div>
                 </div>
             </div>
         )}
      </Section>

      <Section title="Importar datos">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
                <Label>Recurso</Label>
                <div className="rc-input flex items-center opacity-80 cursor-not-allowed select-none">
                  Leads
                </div>
            </div>
            <div>
                <Label>Archivo CSV/JSON</Label>
                <div className="relative">
                  <Input ref={fileRef} type="file" className="file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 pt-2" />
                </div>
            </div>
         </div>
         <div className="mt-6 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" className="accent-blue-600" checked={dryRun} onChange={e=>setDryRun(e.target.checked)} />
                Modo Prueba (Simular)
            </label>
            <Button onClick={handleImport} disabled={importLoading}>Importar</Button>
         </div>
         {importError && <div className="mt-4"><Alert kind="error">{importError}</Alert></div>}
         {importRes && (
           <div className="mt-4 space-y-2">
             <Alert kind={importRes.errors.length?"info":"success"}>
               Procesados: {importRes.created} creados, {importRes.updated} actualizados.
               {importRes.dry_run && " (simulación — no se guardó nada)"}
             </Alert>
             {importRes.errors.length > 0 && (
               <Alert kind="error">
                 <ul className="list-disc pl-4 space-y-1">
                   {importRes.errors.map((err: any, i: number) => (
                     <li key={i}>Fila {err.row}: {err.error}</li>
                   ))}
                 </ul>
               </Alert>
             )}
           </div>
         )}
      </Section>

      <Section title="Seguridad">
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            <div><Label>Actual</Label><Input type="password" value={pwdCur} onChange={(e:any)=>setPwdCur(e.target.value)} /></div>
            <div><Label>Nueva</Label><Input type="password" value={pwdNew} onChange={(e:any)=>setPwdNew(e.target.value)} /></div>
            <div><Label>Repetir</Label><Input type="password" value={pwdNew2} onChange={(e:any)=>setPwdNew2(e.target.value)} /></div>
            {pwdError && <div className="md:col-span-3"><Alert kind="error">{pwdError}</Alert></div>}
            <div className="md:col-span-3 flex items-center justify-end gap-3">
                {pwdSuccess && (
                  <div className="animate-in fade-in slide-in-from-right-5 duration-300 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm
                    bg-emerald-50 border-emerald-200 text-emerald-700 
                    dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                  >
                    <FiCheckCircle className="text-lg shrink-0" />
                    <span className="text-sm font-medium">Contraseña actualizada</span>
                  </div>
                )}
                <Button type="submit" disabled={pwdLoading}>{pwdLoading ? "Cambiando..." : "Cambiar Contraseña"}</Button>
            </div>
        </form>
      </Section>

      {/* Zona de Peligro  */}
      <div className="rounded-2xl border p-6 transition-all duration-200
                      bg-rose-50 border-rose-300 font-medium text-black
                      dark:bg-transparent dark:border-rose-500 dark:font-normal dark:text-white">
        <h2 className="text-lg font-black mb-2 text-rose-900 dark:text-rose-400">Eliminar Cuenta</h2>
        <form onSubmit={handleDeleteSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
        <div>
            
            <Label>
              <span className="text-rose-900 font-black dark:text-rose-400">Escribí ELIMINAR</span>
            </Label>
            
            <Input 
                value={confirmText} 
                onChange={(e:any)=>setConfirmText(e.target.value)} 
                placeholder="ELIMINAR" 
                className="border-rose-300 focus:ring-rose-500/50 dark:border-rose-700 placeholder-rose-400" 
            />
        </div>
        
        <div>
            
            <Label className="text-black dark:text-white">Contraseña</Label>
            
            <Input 
                type="password" 
                value={delPwd} 
                onChange={(e:any)=>setDelPwd(e.target.value)} 
                className="border-rose-300 focus:ring-rose-500/50 dark:border-rose-700" 
            />
        </div>
        
        <div className="flex justify-end">
            <Button variant="danger" type="submit" disabled={delLoading || confirmText!=="ELIMINAR"}>
                Eliminar
            </Button>
        </div>
        {delError && <div className="md:col-span-3"><Alert kind="error">{delError}</Alert></div>}
    </form>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !delLoading && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-rose-500 bg-white dark:bg-[#1a1a1a] p-6 shadow-xl"
            onClick={(e:any) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-rose-900 dark:text-rose-400 mb-2">¿Estás seguro?</h3>
            <p className="text-sm opacity-80 mb-6">
              Esta acción elimina tu cuenta y todos tus datos de forma permanente. No se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={delLoading}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmDeleteAccount} disabled={delLoading}>
                {delLoading ? "Eliminando..." : "Sí, eliminar mi cuenta"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}