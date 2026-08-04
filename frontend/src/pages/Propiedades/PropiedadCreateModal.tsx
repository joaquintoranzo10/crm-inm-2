import type { FormEvent } from "react";
import React, { useRef, useState, useEffect } from "react";
import axios, { AxiosError } from "axios";

<<<<<<< HEAD
const api = axios.create({
  baseURL: "/api/",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  children: React.ReactNode;
}

function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

=======
function Row({ label, children }: { label: string; children: React.ReactNode }) {
>>>>>>> db1be1c5bc52e412cec8d048b99fc2190eabff7a
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-gray-50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

<<<<<<< HEAD
interface SmartLocationComboProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  minChars?: number;
  limit?: number;
  showOnEmpty?: boolean;
}

function SmartLocationCombo({ value, onChange }: SmartLocationComboProps) {
  return (
    <input
      type="text"
      className="rc-input h-8 text-sm w-full px-3 py-1 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Ej: Av. Libertador 1500, Córdoba"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 block ml-1">
        {label}
      </label>
      <div>{children}</div>
    </div>
  );
}

=======
>>>>>>> db1be1c5bc52e412cec8d048b99fc2190eabff7a
function SelectScroll<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onDoc);
    }
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="rc-input h-8 text-sm text-left flex items-center justify-between w-full px-3 py-1 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate block capitalize">
          {value ? value : "Seleccionar..."}
        </span>
        <span className="text-gray-400 text-xs ml-2">▼</span>
      </button>

      {open && (
        <ul
          className="absolute z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100"
          style={{ maxHeight: "200px", overflowY: "auto" }}
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <li key={opt}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm transition-colors capitalize ${isSelected
                      ? "bg-blue-600 text-white font-bold"
                      : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                    }`}
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

type Props = { open: boolean; onClose: () => void; onCreated?: () => void };

type Estado = "disponible" | "vendido" | "reservado";
type TipoProp =
  | "casa"
  | "departamento"
  | "ph"
  | "terreno"
  | "cochera"
  | "local"
  | "oficina"
  | "consultorio"
  | "quinta"
  | "chacra"
  | "galpon"
  | "deposito"
  | "campo"
  | "hotel"
  | "fondo de comercio"
  | "edificio"
  | "otro";
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
<<<<<<< HEAD
  const inputClass =
    "rc-input h-8 text-sm w-full px-3 py-1 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100";
=======

  const inputClass = "rc-input";
>>>>>>> db1be1c5bc52e412cec8d048b99fc2190eabff7a

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

  async function onSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    setSubmitting(true);
    setServerError(null);

    try {
<<<<<<< HEAD
      const formData = new FormData();
=======
      const payload = {
        codigo,
        titulo,
        descripcion,
        ubicacion,
        localidad,
        barrio,
        direccion,
        tipo_de_propiedad: tipoDePropiedad,
        disponibilidad: disponibilidad || "",
        precio: precio === "" ? 0 : Number(precio),
        moneda,
        ambiente: ambiente === "" ? 0 : Number(ambiente),
        antiguedad: antiguedad === "" ? 0 : Number(antiguedad),
        banos: banos === "" ? 0 : Number(banos),
        superficie: superficie === "" ? 0 : Number(superficie),
        cocheras: cocheras === "" ? 0 : Number(cocheras),
        tiene_patio: tienePatio,
        tiene_pileta: tienePileta,
        tiene_quincho: tieneQuincho,
        estado,
      };
>>>>>>> db1be1c5bc52e412cec8d048b99fc2190eabff7a

      // 1. Campos obligatorios y de texto
      formData.append("codigo", codigo.trim());
      formData.append("titulo", titulo.trim());
      formData.append("tipo_de_propiedad", tipoDePropiedad);
      formData.append("disponibilidad", disponibilidad || "venta");
      formData.append("moneda", moneda);
      formData.append("estado", estado);

      if (descripcion.trim()) formData.append("descripcion", descripcion.trim());
      if (ubicacion.trim()) formData.append("ubicacion", ubicacion.trim());

      // 2. Sanitización de campos numéricos
      if (precio !== "" && precio !== null && !isNaN(Number(precio))) {
        formData.append("precio", String(precio));
      }
      if (ambiente !== "" && ambiente !== null && !isNaN(Number(ambiente))) {
        formData.append("ambiente", String(ambiente));
        formData.append("ambientes", String(ambiente));
      }
      if (antiguedad !== "" && antiguedad !== null && !isNaN(Number(antiguedad))) {
        formData.append("antiguedad", String(antiguedad));
      }
      if (banos !== "" && banos !== null && !isNaN(Number(banos))) {
        formData.append("banos", String(banos));
      }
      if (superficie !== "" && superficie !== null && !isNaN(Number(superficie))) {
        formData.append("superficie", String(superficie));
      }

      // 3. Adjuntar las imágenes al mismo FormData
      if (filesToUpload.length > 0) {
        filesToUpload.forEach((file) => {
          formData.append("imagenes", file);
        });
      }

      // 4. Envío ÚNICO al servidor mediante 'api.post' (multipart/form-data)
      await api.post("propiedades/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onCreated?.();
      onClose();

      // Resetear formulario
      setCodigo(""); setTitulo(""); setDescripcion(""); setUbicacion("");
      setTipoDePropiedad("casa"); setDisponibilidad("");
      setPrecio(""); setMoneda("USD"); setAmbiente(""); setAntiguedad("");
      setBanos(""); setSuperficie(""); setEstado("disponible");
      setLocalidad(""); setBarrio(""); setDireccion("");
      setCocheras(""); setTienePatio(false); setTienePileta(false); setTieneQuincho(false);
      setPreviews([]);
      setFilesToUpload([]);

    } catch (err) {
      const e = err as AxiosError<any>;
      console.error("Error al crear la propiedad:", e?.response?.data);

      if (e.response) {
        const status = e.response.status;
        const data = e.response.data;

        if (status === 401) {
          setServerError("Necesitás iniciar sesión para crear propiedades.");
        } else if (status === 400 && data) {
          if (typeof data === "string") {
            setServerError(data);
          } else if (data.detail) {
            setServerError(data.detail);
          } else if (typeof data === "object") {
            const formatted = Object.entries(data)
              .map(([key, val]) => {
                const valStr = Array.isArray(val) ? val.join(" ") : String(val);
                return `${key.toUpperCase()}: ${valStr}`;
              })
              .join(" | ");
            setServerError(formatted);
          }
        } else {
          setServerError(data?.detail || "Error inesperado del servidor.");
        }
      } else {
        setServerError("No hay conexión con el servidor.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar propiedad" maxWidth="xl">
      {serverError && (
        <div className="mb-3 rounded-md border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {serverError}
        </div>
      )}

      <div className="max-h-none overflow-visible pr-2 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          {/* Formulario principal */}
          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-12 gap-3 content-start">
            {/* Código y Título */}
            <div className="col-span-12 sm:col-span-4">
              <Row label="Código *">
                <input
                  className={`${inputClass} font-mono`}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-8">
              <Row label="Título *">
                <input
                  className={inputClass}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </Row>
            </div>

            {/* Ubicación Principal */}
            <div className="col-span-12">
              <Row label="Ubicación General *">
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

            {/* Detalles de Ubicación */}
            <div className="col-span-12 sm:col-span-4">
              <Row label="Localidad">
                <input className={inputClass} value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <Row label="Barrio">
                <input className={inputClass} value={barrio} onChange={(e) => setBarrio(e.target.value)} />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-4">
              <Row label="Dirección exacta">
                <input className={inputClass} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: San Martín 123" />
              </Row>
            </div>

            {/* Tipo y Disponibilidad */}
            <div className="col-span-12 sm:col-span-6">
              <Row label="Tipo de propiedad *">
                <SelectScroll
                  value={tipoDePropiedad}
                  onChange={(v) => setTipoDePropiedad(v as TipoProp)}
                  options={[
                    "casa",
                    "departamento",
                    "ph",
                    "terreno",
                    "cochera",
                    "local",
                    "oficina",
                    "consultorio",
                    "quinta",
                    "chacra",
                    "galpon",
                    "deposito",
                    "campo",
                    "hotel",
                    "fondo de comercio",
                    "edificio",
                    "otro",
                  ]}
                />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Row label="Disponibilidad *">
                <SelectScroll
                  value={disponibilidad}
                  onChange={(v) => setDisponibilidad(v as Disponibilidad)}
                  options={["venta", "alquiler"]}
                />
              </Row>
            </div>

            {/* Precio, Moneda, Estado */}
            <div className="col-span-12 sm:col-span-5">
              <Row label="Precio *">
                <input
                  type="number"
                  min={0}
                  className={`${inputClass} font-medium`}
                  value={precio}
                  onChange={(e) =>
                    setPrecio(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Moneda *">
                <SelectScroll
                  value={moneda}
                  onChange={(v) => setMoneda(v as Moneda)}
                  options={["USD", "ARS"]}
                />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-4">
              <Row label="Estado *">
                <SelectScroll
                  value={estado}
                  onChange={(v) => setEstado(v as Estado)}
                  options={["disponible", "reservado", "vendido"]}
                />
              </Row>
            </div>

<<<<<<< HEAD
            {/* Características */}
=======
>>>>>>> db1be1c5bc52e412cec8d048b99fc2190eabff7a
            <div className="col-span-6 sm:col-span-3">
              <Row label="Ambientes">
                <SelectScroll
                  value={ambiente === "" ? "0" : String(ambiente)}
                  onChange={(v) => setAmbiente(v === "0" ? "" : Number(v))}
                  options={["0", "1", "2", "3", "4", "5"]}
                />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Baños">
                <SelectScroll
                  value={banos === "" ? "0" : String(banos)}
                  onChange={(v) => setBanos(v === "0" ? "" : Number(v))}
                  options={["0", "1", "2", "3", "4", "5"]}
                />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Antigüedad">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={antiguedad}
                  onChange={(e) =>
                    setAntiguedad(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0"
                />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Superficie (m²)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  value={superficie}
                  onChange={(e) =>
                    setSuperficie(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0.00"
                />
              </Row>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Row label="Cocheras">
                <SelectScroll
                  value={cocheras === "" ? "0" : String(cocheras)}
                  onChange={(v) => setCocheras(v === "0" ? "" : Number(v))}
                  options={["0", "1", "2", "3", "4", "5"]}
                />
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
                <textarea
                  rows={4}
                  className={`${inputClass} resize-none h-auto`}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </Row>
            </div>
          </div>

          {/* Sección de Imágenes */}
          <div className="md:col-span-3 space-y-4 border-l border-gray-200 dark:border-gray-700 pl-2 md:block hidden">
            <div>
              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-3">
                Imágenes (Opcional)
              </h3>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 text-center transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30">
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer py-2">
                  <span className="text-sm font-bold text-blue-600 mb-1">
                    + Seleccionar imágenes
                  </span>
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
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Previsualización
                </label>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {previews.length}
                </span>
              </div>

              {previews.length === 0 ? (
                <div className="text-xs text-gray-500 italic">
                  Se subirán junto con la propiedad.
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                  {previews.map((src, i) => (
                    <li
                      key={i}
                      className="relative group rounded-lg overflow-hidden aspect-square border border-gray-200 dark:border-gray-800 shadow-sm"
                    >
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
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-3 h-3"
                        >
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Carga de imágenes para mobile */}
          <div className="md:hidden col-span-12 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Cargar Imágenes
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 dark:file:bg-zinc-800 file:text-gray-700 dark:file:text-gray-200 text-gray-700 dark:text-gray-200"
              onChange={handleFileChange}
            />
            {previews.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {previews.length} imágenes seleccionadas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer del Modal */}
      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 bg-transparent flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-2">
        <button
          type="button"
          className="w-full sm:w-auto px-4 py-2 h-10 rounded-xl text-sm font-bold border border-zinc-400 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all"
          onClick={onClose}
          disabled={submitting}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="w-full sm:w-auto h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 transition-colors shadow-sm"
          onClick={() => onSubmit()}
          disabled={
            submitting ||
            !codigo ||
            !titulo ||
            !ubicacion ||
            precio === "" ||
            !disponibilidad
          }
        >
          {submitting ? "Guardando..." : "Registrar propiedad"}
        </button>
      </div>
    </Modal>
  );
}