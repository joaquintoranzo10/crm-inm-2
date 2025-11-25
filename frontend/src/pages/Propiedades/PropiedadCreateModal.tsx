import type { FormEvent } from "react";
import { useRef, useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import Modal from "@/components/Modal";
import SmartLocationCombo from "@/components/SmartLocationCombo";

//  Componentes Auxiliares 

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SelectScroll<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {/* BOTÓN PRINCIPAL */}
      <button
        type="button"
        className={`h-10 w-full px-3 py-2 text-sm leading-tight text-left flex items-center justify-between outline-none rounded-lg border transition-colors
          bg-[var(--surface)] text-[var(--text)] border-[var(--border)]
          focus:border-blue-500 focus:ring-1 focus:ring-blue-500
          ${className}`}
        onClick={() => setOpen(!open)}
      >
        <span className="truncate block capitalize">
          {value ? value : "Seleccionar..."}
        </span>
        <span className="text-gray-400 text-xs ml-2">▼</span>
      </button>

      {/* LISTA DESPLEGABLE */}
      {open && (
        <ul
          className="absolute z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 border
            bg-[var(--surface)] border-[var(--border)]"
          style={{ maxHeight: "180px", overflowY: "auto" }}
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <li key={opt}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm transition-colors capitalize
                    ${isSelected
                      ? "bg-blue-600 text-white font-bold" 
                      : "text-[var(--text)] hover:bg-gray-100 dark:hover:bg-gray-700" 
                    }
                  `}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Tipos

type Props = { open: boolean; onClose: () => void; onCreated?: () => void };

type Estado = "disponible" | "vendido" | "reservado";
type TipoProp = "casa" | "departamento" |"ph"|"terreno"|"cochera"|"local"|"oficina"|"consultorio"|"quinta"|"chacra"|"galpon"|"deposito"|"campo"| "hotel"|"fondo de comercio"|"edificio"|"otro";
type Moneda = "USD" | "ARS";
type Disponibilidad = "venta" | "alquiler";

// Componente Principal

export default function PropiedadCreateModal({ open, onClose, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [tipoDePropiedad, setTipoDePropiedad] = useState<TipoProp>("casa");
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | "">(""); 
  const [precio, setPrecio] = useState<number | "">("");
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [ambiente, setAmbiente] = useState<number | "">("");
  const [antiguedad, setAntiguedad] = useState<number | "">("");
  const [banos, setBanos] = useState<number | "">("");
  const [superficie, setSuperficie] = useState<number | "">("");
  const [estado, setEstado] = useState<Estado>("disponible");

  //Array normal (File[]) para poder acumular imágenes
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]); 
  const [previews, setPreviews] = useState<string[]>([]);
  
  // Referencia para limpiar el input html
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const inputClass = "rc-input h-10 w-full px-3 py-2 text-sm leading-tight focus:outline-none";

  useEffect(() => {
    if (open) {
        setServerError(null);
        
    }
  }, [open]);

  // Lógica de Archivos 
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    
    if (selectedFiles && selectedFiles.length > 0) {
      const newFilesArray = Array.from(selectedFiles);
      
      setFilesToUpload((prev) => [...prev, ...newFilesArray]);


      const newUrls = newFilesArray.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => [...prev, ...newUrls]);
    }
    
    if (e.target) e.target.value = "";
  }

  // Función para eliminar una imagen de la lista antes de subir
  function removeImage(index: number) {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadImagen(propId: number) {
    // Usamos el array acumulado
    if (filesToUpload.length === 0) return;

    const fd = new FormData();
    filesToUpload.forEach((f) => {
      fd.append("imagenes", f);
    });

    await axios.post(`/api/propiedades/${propId}/subir-imagenes/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // Limpieza total post-subida
    setPreviews([]);
    setFilesToUpload([]);
  }

  async function onSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    setSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        codigo,
        titulo,
        descripcion,
        ubicacion,
        tipo_de_propiedad: tipoDePropiedad,
        disponibilidad: disponibilidad || "",
        precio: precio === "" ? 0 : Number(precio),
        moneda,
        ambiente: ambiente === "" ? 0 : Number(ambiente),
        antiguedad: antiguedad === "" ? 0 : Number(antiguedad),
        banos: banos === "" ? 0 : Number(banos),
        superficie: superficie === "" ? 0 : Number(superficie),
        estado,
      };

      const res = await axios.post("/api/propiedades/", payload);
      const newId: number = res.data?.id;

      try { 
        await uploadImagen(newId); 
      } catch (e) {
        console.warn("Propiedad creada, pero falló la subida de imagen", e);
      }

      onCreated?.();
      onClose();

      // Resetear formulario
      setCodigo(""); setTitulo(""); setDescripcion(""); setUbicacion("");
      setTipoDePropiedad("casa"); setDisponibilidad("");
      setPrecio(""); setMoneda("USD"); setAmbiente(""); setAntiguedad("");
      setBanos(""); setSuperficie(""); setEstado("disponible");
      setPreviews([]); 
      setFilesToUpload([]);
      
    } catch (err) {
      const e = err as AxiosError<any>;
      if (e.response) {
        const status = e.response.status;
        const data = e.response.data;
        if (status === 401) {
          setServerError("Necesitás iniciar sesión para crear propiedades.");
        } else if (status === 400 && data) {
          const firstKey = Object.keys(data)[0];
          const firstVal = Array.isArray(data[firstKey]) ? data[firstKey][0] : JSON.stringify(data[firstKey]);
          setServerError(`${firstKey}: ${firstVal}`);
        } else {
          setServerError("Error inesperado del servidor.");
        }
      } else {
        setServerError("No hay conexión con el servidor.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar propiedad" maxWidth="4xl">
      {serverError && (
        <div className="mb-3 rounded-md border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {serverError}
        </div>
      )}

      <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar pb-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* Formulario */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-12 gap-5 content-start">

            {/* Código y Título */}
            <div className="col-span-12 sm:col-span-3">
              <Row label="Código *">
                <input 
                  className={`${inputClass} font-mono`} 
                  value={codigo} 
                  onChange={(e) => setCodigo(e.target.value)} 
                />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-9">
               <Row label="Título *">
                <input className={inputClass} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </Row>
            </div>

            {/* Ubicación */}
            <div className="col-span-12">
               <Row label="Ubicación *">
                 <SmartLocationCombo
                    value={ubicacion}
                    onChange={(v) => setUbicacion(v)}
                    required
                    minChars={2}
                    limit={10}
                    showOnEmpty={false}
                  />
              </Row>
            </div>

            {/* Tipo y Disponibilidad */}
             <div className="col-span-12 sm:col-span-6">
              <Row label="Tipo de propiedad *">
                  <SelectScroll
                    value={tipoDePropiedad}
                    onChange={(v) => setTipoDePropiedad(v as TipoProp)}
                    options={[
                      "casa","departamento","ph","terreno","cochera","local","oficina",
                      "consultorio","quinta","chacra","galpon","deposito","campo",
                      "hotel","fondo de comercio","edificio","otro",
                    ]}
                  />
                </Row>
             </div>
             <div className="col-span-12 sm:col-span-6">
                <Row label="Disponibilidad *">
                  <select
                    className={inputClass}
                    value={disponibilidad}
                    onChange={(e) => setDisponibilidad(e.target.value as Disponibilidad)}
                  >
                    <option value="">— Seleccionar —</option>
                    <option value="venta">Venta</option>
                    <option value="alquiler">Alquiler</option>
                  </select>
                </Row>
             </div>

            {/* Precio, Moneda, Estado */}
            <div className="col-span-12 sm:col-span-5">
              <Row label="Precio *">
                  <input type="number" min={0} className={`${inputClass} font-medium`}
                    value={precio} onChange={(e) => setPrecio(e.target.value === "" ? "" : Number(e.target.value))} />
                </Row>
            </div>
             <div className="col-span-6 sm:col-span-3">
               <Row label="Moneda *">
                  <select className={inputClass}
                    value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </Row>
             </div>
             <div className="col-span-6 sm:col-span-4">
                 <Row label="Estado *">
                  <select
                    className={`${inputClass} font-medium`}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as Estado)}
                  >
                    <option value="disponible">Disponible</option>
                    <option value="reservado">Reservado</option>
                    <option value="vendido">Vendido</option>
                  </select>
                </Row>
             </div>

             {/* Características */}
             <div className="col-span-6 sm:col-span-3">
                 <Row label="Ambientes">
                  <select
                    className={inputClass}
                    value={ambiente}
                    onChange={(e) => setAmbiente(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    <option value="">0</option>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {num === 5 ? "5+" : num}
                      </option>
                    ))}
                  </select>
                </Row>
             </div>
              <div className="col-span-6 sm:col-span-3">
                 <Row label="Baños">
                  <select
                    className={inputClass}
                    value={banos}
                    onChange={(e) => setBanos(e.target.value === "" ? "" : Number(e.target.value))}
                  >
                    <option value="">0</option>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {num === 5 ? "5+" : num}
                      </option>
                    ))}
                  </select>
                </Row>
              </div>
              <div className="col-span-6 sm:col-span-3">
                 <Row label="Antigüedad">
                  <input
                    type="number" min={0} className={inputClass}
                    value={antiguedad} onChange={(e) => setAntiguedad(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </Row>
              </div>
              <div className="col-span-6 sm:col-span-3">
                  <Row label="Superficie (m²)">
                  <input
                    type="number" min={0} step="0.01" className={inputClass}
                    value={superficie} onChange={(e) => setSuperficie(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </Row>
              </div>

            {/* Descripción */}
            <div className="col-span-12">
              <Row label="Descripción">
                <textarea rows={4} className="rc-input w-full p-3 text-sm resize-none" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </Row>
            </div>
          </div>

          {/* Imágenes*/}
          <div className="md:col-span-4 space-y-5 border-l border-gray-200 dark:border-gray-700 pl-8 md:block hidden">
            
            <div>
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-3">Imágenes (Opcional)</h3>
              
              {/* CAJA DE CARGA CLARA (bg-blue-50) */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 text-center transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30">
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                   <span className="text-sm font-bold text-blue-600 mb-1">+ Seleccionar imágenes</span>
                   <span className="text-xs text-gray-400">JPG, PNG. Múltiples.</span>
                   <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                 </label>
              </div>
            </div>

            {/* Lista de Previsualización */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Previsualización</label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {previews.length}
                </span>
              </div>

              {previews.length === 0 ? (
                <div className="text-xs rc-muted italic">Se subirán junto con la propiedad.</div>
              ) : (
                <ul className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                  {previews.map((src, i) => (
                    <li key={i} className="relative group rounded-lg overflow-hidden aspect-square border border-gray-200 dark:border-gray-800 shadow-sm">
                      <img
                        src={src}
                        alt={`Preview ${i}`}
                        className="w-full h-full object-cover"
                      />
                      
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Quitar imagen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

           {/* Versión móvil de carga de imágenes */}
           <div className="md:hidden col-span-12 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
             <label className="text-sm font-medium">Cargar Imágenes</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200"
                onChange={handleFileChange}
              />
               {previews.length > 0 && <p className="text-xs rc-muted mt-2">{previews.length} imágenes seleccionadas.</p>}
           </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t rc-border bg-transparent flex items-center justify-end gap-2">
        <button 
          className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white" 
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 transition-colors shadow-sm"
          onClick={() => onSubmit()}
          disabled={submitting || !codigo || !titulo || !ubicacion || precio === "" || !disponibilidad}
        >
          {submitting ? "Guardando..." : "Registrar propiedad"}
        </button>
      </div>
    </Modal>
  );
}