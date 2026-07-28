import type { FormEvent } from "react";
import { useRef, useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import Modal from "@/components/Modal";
import Select from "react-select";
import geoData from "@/data/arg-geo.json";


const opcionesUbicacion = geoData.provinces.flatMap((provincia: any) =>
  provincia.departments.flatMap((depto: any) =>
    depto.localities.map((loc: any) => ({
      label: `${loc.name}, ${depto.name} (${provincia.name})`,
      value: {
        ubicacionGeneral: `${provincia.name}, ${depto.name}`,
        localidad: loc.name
      }
    }))
  )
);


const customSelectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--text-main)',
    minHeight: '2.5rem',
    borderRadius: '0.5rem',
    boxShadow: 'none',
    '&:hover': { borderColor: '#3b82f6' }
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    zIndex: 50
  }),
  singleValue: (base: any) => ({ ...base, color: 'var(--text-main)' }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? '#3b82f6' : 'transparent',
    color: state.isFocused ? 'white' : 'var(--text-main)',
    cursor: 'pointer'
  }),
  input: (base: any) => ({ ...base, color: 'var(--text-main)' }),
  placeholder: (base: any) => ({ ...base, color: 'var(--muted)' })
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 block ml-1">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function SelectScroll<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: T[]; }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" className="rc-input h-8 text-sm text-left flex items-center justify-between" onClick={() => setOpen(!open)}>
        <span className="truncate block capitalize">{value ? value : "Seleccionar..."}</span>
        <span className="text-gray-400 text-xs ml-2">▼</span>
      </button>
      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden border rc-border bg-[var(--surface)] text-[var(--text-main)]" style={{ maxHeight: "200px", overflowY: "auto" }}>
          {options.map((opt) => (
            <li key={opt}>
              <button type="button" className={`w-full text-left px-3 py-2 text-sm transition-colors capitalize ${opt === value ? "bg-blue-600 text-white font-bold" : "hover:bg-gray-100 dark:hover:bg-zinc-800"}`} onClick={() => { onChange(opt); setOpen(false); }}>
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Props = { open: boolean; onClose: () => void; onCreated?: () => void };
type Estado = "disponible" | "vendido" | "reservado";
type TipoProp = "casa" | "departamento" | "ph" | "terreno" | "cochera" | "local" | "oficina" | "consultorio" | "quinta" | "chacra" | "galpon" | "deposito" | "campo" | "hotel" | "fondo de comercio" | "edificio" | "otro";
type Moneda = "USD" | "ARS";
type Disponibilidad = "venta" | "alquiler";

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
  
  const [localidad, setLocalidad] = useState("");
  const [barrio, setBarrio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cocheras, setCocheras] = useState<number | "">("");
  const [tienePatio, setTienePatio] = useState(false);
  const [tienePileta, setTienePileta] = useState(false);
  const [tieneQuincho, setTieneQuincho] = useState(false);

  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputClass = "rc-input";

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

  function removeImage(index: number) {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadImagen(propId: number) {
    if (filesToUpload.length === 0) return;
    const fd = new FormData();
    filesToUpload.forEach((f) => fd.append("imagenes", f));
    await axios.post(`/api/propiedades/${propId}/subir-imagenes/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    setPreviews([]);
    setFilesToUpload([]);
  }

  async function onSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    setSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        codigo, titulo, descripcion, ubicacion, localidad, barrio, direccion,
        tipo_de_propiedad: tipoDePropiedad,
        disponibilidad: disponibilidad || "",
        precio: precio === "" ? 0 : Number(precio),
        moneda,
        ambiente: ambiente === "" ? 0 : Number(ambiente),
        antiguedad: antiguedad === "" ? 0 : Number(antiguedad),
        banos: banos === "" ? 0 : Number(banos),
        superficie: superficie === "" ? 0 : Number(superficie),
        cocheras: cocheras === "" ? 0 : Number(cocheras),
        tiene_patio: tienePatio, tiene_pileta: tienePileta, tiene_quincho: tieneQuincho, estado,
      };

      const res = await axios.post("/api/propiedades/", payload);
      try { await uploadImagen(res.data?.id); } catch (e) { console.warn("Falló subida de imagen", e); }

      onCreated?.();
      onClose();
    } catch (err) {
      const e = err as AxiosError<any>;
      if (e.response) {
        const data = e.response.data;
        if (e.response.status === 401) setServerError("Necesitás iniciar sesión.");
        else if (e.response.status === 400 && data) {
          const firstKey = Object.keys(data)[0];
          setServerError(`${firstKey}: ${Array.isArray(data[firstKey]) ? data[firstKey][0] : JSON.stringify(data[firstKey])}`);
        } else setServerError("Error inesperado del servidor.");
      } else setServerError("No hay conexión con el servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar propiedad" maxWidth="xl">
      {serverError && <div className="mb-3 rounded-md border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-700">{serverError}</div>}
      <div className="max-h-none overflow-visible pr-2 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">

          {/* Formulario */}
          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-12 gap-3 content-start">
            <div className="col-span-12 sm:col-span-4">
              <Row label="Código *">
                <input className={`${inputClass} font-mono h-8 text-sm`} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-8">
              <Row label="Título *">
                <input className={inputClass} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </Row>
            </div>

            
            <div className="col-span-12">
              <Row label="Buscador Inteligente de Ubicación">
                <Select
                  options={opcionesUbicacion}
                  placeholder="Empezá a escribir (Ej: Marcos Juárez)..."
                  noOptionsMessage={() => "No se encontraron localidades"}
                  onChange={(selectedItem: any) => {
                    if (selectedItem) {
                      setUbicacion(selectedItem.value.ubicacionGeneral);
                      setLocalidad(selectedItem.value.localidad);
                    }
                  }}
                  isClearable
                  styles={customSelectStyles}
                />
              </Row>
            </div>

            
            <div className="col-span-12 sm:col-span-6">
              <Row label="Ubicación General *">
                <input className={inputClass} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Provincia, Departamento" />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Row label="Localidad">
                <input className={inputClass} value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Ej: Marcos Juárez" />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Row label="Barrio">
                <input className={inputClass} value={barrio} onChange={(e) => setBarrio(e.target.value)} />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Row label="Dirección exacta">
                <input className={inputClass} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: San Martín 123" />
              </Row>
            </div>

            {/* Tipo y Disponibilidad */}
            <div className="col-span-12 sm:col-span-6">
              <Row label="Tipo de propiedad *">
                <SelectScroll value={tipoDePropiedad} onChange={(v) => setTipoDePropiedad(v as TipoProp)} options={["casa", "departamento", "ph", "terreno", "cochera", "local", "oficina", "consultorio", "quinta", "chacra", "galpon", "deposito", "campo", "hotel", "fondo de comercio", "edificio", "otro"]} />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Row label="Disponibilidad *">
                <SelectScroll value={disponibilidad} onChange={(v) => setDisponibilidad(v as Disponibilidad)} options={["venta", "alquiler"]} />
              </Row>
            </div>

            {/* Precio, Moneda, Estado */}
            <div className="col-span-12 sm:col-span-5">
              <Row label="Precio *">
                <input type="number" min={0} className={`${inputClass} font-medium`} value={precio} onChange={(e) => setPrecio(e.target.value === "" ? "" : Number(e.target.value))} />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Moneda *">
                <SelectScroll value={moneda} onChange={(v) => setMoneda(v as Moneda)} options={["USD", "ARS"]} />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-4">
              <Row label="Estado *">
                <SelectScroll value={estado} onChange={(v) => setEstado(v as Estado)} options={["disponible", "reservado", "vendido"]} />
              </Row>
            </div>

            
            <div className="col-span-6 sm:col-span-3">
              <Row label="Ambientes">
                <SelectScroll value={ambiente === "" ? "0" : String(ambiente)} onChange={(v) => setAmbiente(v === "0" ? "" : Number(v))} options={["0", "1", "2", "3", "4", "5"]} />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Baños">
                <SelectScroll value={banos === "" ? "0" : String(banos)} onChange={(v) => setBanos(v === "0" ? "" : Number(v))} options={["0", "1", "2", "3", "4", "5"]} />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
                <Row label="Antigüedad">
                  <input type="number" min={0} className={inputClass} value={antiguedad} onChange={(e) => setAntiguedad(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
                </Row>
              </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Superficie (m²)">
                <input type="number" min={0} step="0.01" className={inputClass} value={superficie} onChange={(e) => setSuperficie(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0.00" />
              </Row>
            </div>

            
            <div className="col-span-6 sm:col-span-3">
              <Row label="Cocheras">
                <SelectScroll value={cocheras === "" ? "0" : String(cocheras)} onChange={(v) => setCocheras(v === "0" ? "" : Number(v))} options={["0", "1", "2", "3", "4", "5"]} />
              </Row>
            </div>

            <div className="col-span-12 flex flex-wrap gap-6 mt-1 p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-200 dark:border-zinc-800">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={tienePatio} onChange={e => setTienePatio(e.target.checked)} className="accent-blue-600 w-4 h-4 rounded" />
                Tiene Patio
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={tienePileta} onChange={e => setTienePileta(e.target.checked)} className="accent-blue-600 w-4 h-4 rounded" />
                Tiene Pileta
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={tieneQuincho} onChange={e => setTieneQuincho(e.target.checked)} className="accent-blue-600 w-4 h-4 rounded" />
                Tiene Quincho
              </label>
            </div>

            {/* Descripción */}
            <div className="col-span-12">
              <Row label="Descripción">
                <textarea rows={4} className={`${inputClass} resize-none h-auto`} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </Row>
            </div>
          </div>

          {/*  Imágenes */}
          <div className="md:col-span-3 space-y-4 border-l border-gray-100 dark:border-gray-800 pl-3 md:block hidden">
            <div>
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-3">Imágenes</h3>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 text-center transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30">
                <label className="flex flex-col items-center justify-center cursor-pointer py-2">
                  <span className="text-sm font-bold text-blue-600 mb-1">+ Seleccionar</span>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              {previews.length > 0 && (
                <ul className="grid grid-cols-2 gap-2 mt-3">
                  {previews.map((src, i) => (
                    <li key={i} className="relative group rounded overflow-hidden aspect-square border border-blue-200">
                      <img src={src} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center">x</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t rc-border bg-transparent flex justify-end gap-2">
        <button className="h-10 px-4 rounded-xl text-sm font-bold border border-zinc-400 text-zinc-600 hover:bg-zinc-500 hover:text-white transition-colors" onClick={onClose}>Cancelar</button>
        <button className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60" onClick={() => onSubmit()} disabled={submitting || !codigo || !titulo || !ubicacion || precio === "" || !disponibilidad}>{submitting ? "Guardando..." : "Registrar propiedad"}</button>
      </div>
    </Modal>
  );
}