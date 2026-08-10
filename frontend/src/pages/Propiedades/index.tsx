import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import PropiedadCreateModal from "./PropiedadCreateModal";
import Modal from "@/components/Modal";
import clsx from "clsx";
import { Ruler } from "lucide-react";
import Select from "react-select";
import geoData from "@/data/arg-geo.json";

// Tipo de imagen asociada a una propiedad
type PropiedadImagen = { id: number; imagen: string; descripcion?: string | null };

// Tipos posibles de propiedad 
type TipoProp =
  | "casa" | "departamento" | "ph" | "terreno" | "cochera" | "local" | "oficina"
  | "consultorio" | "quinta" | "chacra" | "galpon" | "deposito" | "campo"
  | "hotel" | "fondo de comercio" | "edificio" | "otro";

// Modelo principal de Propiedad 
type Propiedad = {
  localidad?: string;
  barrio?: string;
  direccion?: string;
  cocheras?: number;
  tiene_patio?: boolean;
  tiene_pileta?: boolean;
  tiene_quincho?: boolean;
  id: number;
  codigo: string;
  titulo: string;
  descripcion?: string;
  ubicacion: string;
  tipo_de_propiedad: TipoProp;
  disponibilidad?: string;
  precio: number | string;
  moneda: "USD" | "ARS";
  ambiente: number;
  antiguedad: number;
  banos: number;
  superficie: number | string;
  estado: "disponible" | "vendido" | "reservado";
  imagenes?: PropiedadImagen[];
};

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

// Normaliza respuestas del backend para asegurar arrays
function toArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.results)) return data.results as T[];
  return [];
}

// URL base del backend 
const BACKEND_ORIGIN =
  (import.meta as any).env?.VITE_BACKEND_ORIGIN || "https://crm-real-connect.onrender.com";

// Devuelve la ruta completa de un archivo multimedia
function absMedia(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BACKEND_ORIGIN}${url}`;
}

// Toma la primera imagen de la propiedad
function firstImage(p: Propiedad): string | null {
  const raw = p.imagenes && p.imagenes.length ? p.imagenes[0].imagen : null;
  const abs = absMedia(raw);
  return abs || null;
}

// Formatea número como precio con símbolo de moneda
function money(n: number | string, moneda: "USD" | "ARS") {
  const num = typeof n === "string" ? Number(n) : n;
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${moneda} ${num}`;
  }
}

// Define los estilos del badge de estado (Disponible / Reservado / Vendido)
function badgeEstado(estado: Propiedad["estado"]) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";
  if (estado === "disponible")
    return `${base} bg-green-200 text-green-900 dark:bg-green-700 dark:text-white`;
  if (estado === "reservado")
    return `${base} bg-yellow-200 text-yellow-900 dark:bg-yellow-700 dark:text-white`;
  return `${base} bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-white`;
}

// Define los estilos del badge de tipo de propiedad
function badgeTipo(tipo: Propiedad["tipo_de_propiedad"]) {
  return { className: "inline-flex items-center rounded-md px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wide shadow-md transition-colors bg-zinc-900 text-white dark:bg-white dark:text-zinc-900", label: tipo };
}



function ThumbnailCarousel({ images }: { images: (string | null | undefined)[] }) {
  const valid = images.filter(Boolean) as string[];
  const [i, setI] = useState(0); // índice actual

  // Si no hay imágenes, mostramos un placeholder
  if (valid.length === 0) {
    return (
      <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400">
        Sin imagen
      </div>
    );
  }

  const prev = () => setI((curr) => (curr - 1 + valid.length) % valid.length);
  const next = () => setI((curr) => (curr + 1) % valid.length);

  return (
    <div className="flex flex-col gap-3 w-full h-full">

      {/* PARTE SUPERIOR: IMAGEN GRANDE */}
      <div className="relative flex-1 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-black group">
        <img
          src={valid[i]}
          alt="Principal"

          className="w-full h-full object-contain"
        />


        {valid.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            >
              ›
            </button>
          </>
        )}
      </div>
      {/* PARTE INFERIOR: MINIATURAS*/}
      {valid.length > 1 && (
        <div className="h-11 sm:h-16 w-full flex gap-2 overflow-x-auto pb-1 px-1 snap-x">
          {valid.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={clsx(
                "relative h-full aspect-[4/3] flex-shrink-0 rounded-lg overflow-hidden transition-all border snap-start",
                i === idx
                  ? "border-blue-500 ring-1 ring-blue-500 opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img src={img} alt="thumb" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Normaliza texto para búsquedas
const norm = (s?: string | number | null) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

// Convierte cualquier texto a “venta” o “alquiler”
const asDisponibilidad = (s?: string | null): "venta" | "alquiler" => {
  const n = (s ?? "").toString().toLowerCase();
  if (n.startsWith("alq")) return "alquiler";
  if (n.startsWith("ven")) return "venta";
  return "venta";
};

/* Select muestra 4 en el desplegable */
import type { ReactNode } from "react";

function Select4<T extends string>({
  label, value, onChange, options, render = (v) => v as unknown as string, className = "",
}: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: T[];
  render?: (v: T) => string
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (!rootRef.current) return;
      const target = ev.target as Node | null;
      if (target && !rootRef.current.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const ITEM_H = 36;
  const maxH = ITEM_H * 4;

  return (
    <div ref={rootRef} className="relative">
      {label && <label className="text-sm">{label}</label>}
      <button
        type="button"
        className={`rc-input h-10 w-full text-left flex items-center justify-between ${className}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="truncate">{render(value)}</span>
        <span className="ml-2 text-xs">▾</span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border rc-border shadow-lg overflow-hidden bg-[var(--surface)] text-[var(--base-clr)]"
          style={{ maxHeight: maxH, overflowY: "auto" }}
        >
          {options.map(opt => {
            const active = opt === value;
            return (
              <button
                key={opt}
                type="button"
                className={`w-full text-left px-3 h-9 text-sm transition-colors
                      hover:bg-gray-100 dark:hover:bg-gray-700
                      ${active
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 font-medium"
                    : "text-[var(--base-clr)]"
                  }`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {render(opt)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}



/* carrusel  para mostrar imágenes */

function CardCarousel({ images }: { images: (string | null | undefined)[] }) {
  const valid = images.filter(Boolean) as string[];
  const [i, setI] = useState(0);
  const len = valid.length;

  // Si no hay imágenes, mostramos placeholder
  if (len === 0) {
    return <div className="relative aspect-[2/1] sm:aspect-[16/9] bg-gray-200 dark:bg-gray-800 rounded-t-xl flex items-center justify-center text-gray-400 text-xs">Sin imagen</div>;
  }

  const prev = () => setI((v) => (v - 1 + len) % len);
  const next = () => setI((v) => (v + 1) % len);

  // Lógica para Swipe en móvil (sin cambios, funciona bien)
  const touch = useRef<{ x: number | null }>({ x: null });
  const onTouchStart = (e: React.TouchEvent) => { touch.current.x = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touch.current.x == null) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    if (Math.abs(dx) > 40) (dx > 0 ? prev() : next());
    touch.current.x = null;
  };

  return (
    <div
      className="relative aspect-[2/1] sm:aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-t-2xl group"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        key={valid[i]}
        src={valid[i]}
        alt={`Imagen ${i + 1}`}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
        loading="lazy"
      />


      {len > 1 && (
        <>
          {/* Flecha Izquierda */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center 
                       bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-all 
                       opacity-0 group-hover:opacity-100 z-10"
            aria-label="Anterior"
          >
            ‹
          </button>

          {/* Flecha Derecha */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center 
                       bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-all 
                       opacity-0 group-hover:opacity-100 z-10"
            aria-label="Siguiente"
          >
            ›
          </button>

          {/* Puntos indicadores  */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {valid.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setI(idx);
                }}
                className={`h-1.5 rounded-full transition-all shadow-sm ${idx === i ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* Componente principal: PropiedadesPage*/
export default function PropiedadesPage() {
  // Estados principales
  const [items, setItems] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Propiedad | null>(null);
  const [editTarget, setEditTarget] = useState<Propiedad | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Propiedad | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  /*Traer propiedades desde el backend */
  async function fetchProps() {
    setLoading(true);
    try {
      const res = await axios.get("/api/propiedades/");
      setItems(toArray<Propiedad>(res.data));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProps();
  }, []);


  async function copyPropTag(p: Propiedad) {
    const tag = `@Propiedad ${p.id}`;
    try {
      await navigator.clipboard.writeText(tag);
      setResult({ ok: true, msg: `Copiado: ${tag}` });
    } catch {
      setResult({ ok: false, msg: "No se pudo copiar al portapapeles." });
    }
  }

  /* Búsqueda inteligente */
  const filtered = useMemo(() => {
    const query = norm(q);
    if (!query) return items;

    return items.filter((p) => {
      const indexable = [
        p.titulo, p.descripcion, p.ubicacion, p.codigo,
        p.disponibilidad, p.tipo_de_propiedad, p.estado, p.moneda, p.precio,
      ].map(norm).join(" | ");
      return indexable.includes(query);
    });
  }, [items, q]);

  const cardStyles = `
    .card_box { width: 100%; border-radius: 20px; position: relative; transition: all .3s; cursor: pointer; }
    .card_box:hover { transform: scale(0.97); }
    .ribbon-wrapper { position: absolute; overflow: hidden; width: 120px; height: 120px; top: -10px; left: -10px; display: flex; align-items: center; justify-content: center; z-index: 20; pointer-events: none; }
    .ribbon-content { position: absolute; width: 150%; height: 30px; background-image: linear-gradient(45deg, #ff6547 0%, #ffb144 51%, #ff7053 100%); transform: rotate(-45deg) translateY(-15px); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; box-shadow: 0 5px 10px rgba(0,0,0,0.23); }
    @media (max-width: 639px) {
      .ribbon-wrapper { width: 90px; height: 90px; top: -8px; left: -8px; }
      .ribbon-content { height: 22px; font-size: 8px; transform: rotate(-45deg) translateY(-11px); }
    }
  `;


  return (

    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>
          <h2 className="text-3xl font-black tracking-tighter mb-1 text-base-clr">
            Gestión de propiedades
          </h2>
          <div className="text-sm text-muted-clr">
            Administra tu cartera de propiedades y su disponibilidad.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 md:mt-0">
          <div className="relative w-full sm:w-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar..."
              className="bg-[var(--surface)] text-[var(--text-main)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors w-full md:w-64 placeholder-[var(--muted)] shadow-sm"
            />
            {q && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={() => setQ("")}>Limpiar</button>}
          </div>
          <button
            onClick={() => setOpenCreate(true)}
            className="w-full sm:w-auto h-10 px-4 rounded-lg text-sm font-bold transition-all border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white shadow-sm flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
            </svg>
            <span>Registrar propiedad</span>
          </button>
        </div>
      </div>
      <style>{cardStyles}</style>


      {loading ? (
        <div className="text-sm">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm rc-muted">No hay propiedades que coincidan con tu búsqueda.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {filtered.map((p) => {
            const tipo = badgeTipo(p.tipo_de_propiedad);

            let ribbonGradient = {};
            if (p.estado === 'disponible') {
              ribbonGradient = { backgroundImage: "linear-gradient(45deg, #4ade80 0%, #22c55e 51%, #16a34a 100%)", boxShadow: "0 5px 10px rgba(0,0,0,0.2)" };
            } else if (p.estado === 'vendido') {
              ribbonGradient = { backgroundImage: "linear-gradient(45deg, #ef4444 0%, #dc2626 51%, #b91c1c 100%)", boxShadow: "0 5px 10px rgba(0,0,0,0.2)" };
            }

            return (
              <article
                key={p.id}
                className="card_box flex flex-col bg-white border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.12)] dark:bg-gradient-to-br dark:from-[#3a38389f] dark:to-[#1f1f1f] dark:border-none dark:shadow-[0_25px_50px_rgba(0,0,0,0.55)] dark:hover:shadow-[0_15px_30px_rgba(0,0,0,0.7)]"
                onClick={() => setDetail(p)}
              >

                {/* CINTA DE ESTADO */}
                <div className="ribbon-wrapper">
                  <div className="ribbon-content" style={ribbonGradient}>
                    {p.estado === 'disponible' ? 'Disponible' : p.estado}
                  </div>
                </div>

                {/* Imagen superior */}
                <div className="relative">
                  <CardCarousel images={(p.imagenes || []).map(x => absMedia(x.imagen))} />
                  <div className="absolute top-2 right-2 pointer-events-none z-10">
                    <span className={tipo.className}>{tipo.label}</span>
                  </div>
                </div>

                {/* Cuerpo de la tarjeta */}
                <div className="p-3 sm:p-5 space-y-1 sm:space-y-2 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">{p.ubicacion}</div>
                    {!!p.disponibilidad && (
                      <div className="text-[9px] sm:text-[10px] uppercase font-bold text-orange-600 bg-orange-50 border border-orange-200 dark:bg-transparent dark:text-orange-400 dark:border-orange-400/30 px-1.5 py-0.5 rounded">
                        {p.disponibilidad}
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-base sm:text-lg leading-tight text-gray-900 dark:text-white">{p.titulo}</h3>
                  <div className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white">{money(p.precio, p.moneda)}</div>

                  {!!p.descripcion && (
                    <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.descripcion}</p>
                  )}
                </div>

                {/* Footer de la card */}
                <div className="mt-auto px-3 py-2.5 sm:px-5 sm:py-4 border-t border-gray-100 dark:border-white/10">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2.5 sm:mb-4">
                    {[
                      { k: "Amb", v: p.ambiente ?? "-" },
                      { k: "Baños", v: p.banos ?? "-" },
                      { k: "Antig", v: p.antiguedad ? `${p.antiguedad} Años` : "0 Años" },
                      { k: "Sup", v: `${p.superficie} m²` },
                      { k: "Cod", v: p.codigo },
                    ].map((it) => (
                      <div key={it.k} className="bg-gray-50 dark:bg-white/5 rounded-lg px-1 py-1 sm:py-1.5 text-center border border-gray-100 dark:border-white/5">
                        <div className="text-[8px] sm:text-[9px] text-gray-500 uppercase">{it.k}</div>
                        <div className="text-[11px] sm:text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{it.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Botones 3D */}
                  <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                    <button
                      className="flex-1 cursor-pointer transition-all bg-gray-600 text-white px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border-gray-700 border-b-[3px] sm:border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-[10px] sm:text-[11px] font-bold text-center"
                      onClick={(e) => { e.stopPropagation(); setDetail(p); }}
                    >
                      VER
                    </button>
                    <button
                      className="flex-1 cursor-pointer transition-all bg-blue-500 text-white px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border-blue-700 border-b-[3px] sm:border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-[10px] sm:text-[11px] font-bold text-center"
                      onClick={(e) => { e.stopPropagation(); setEditTarget(p); }}
                    >
                      EDITAR
                    </button>
                    <button
                      className="flex-1 cursor-pointer transition-all bg-rose-500 text-white px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border-rose-700 border-b-[3px] sm:border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-[10px] sm:text-[11px] font-bold text-center"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                    >
                      BORRAR
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODALES */}

      <PropiedadCreateModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={fetchProps} />
      {detail && <PropiedadDetailModal propiedad={detail} onClose={() => setDetail(null)} onEdit={() => { setEditTarget(detail); setDetail(null); }} onDelete={() => { setDeleteTarget(detail); setDetail(null); }} onCopyTag={() => copyPropTag(detail)} />}
      {editTarget && <PropiedadEditModal propiedad={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); fetchProps(); setResult({ ok: true, msg: "Actualizada" }); }} />}
      {deleteTarget && <ConfirmModal title="Eliminar" message={`¿Borrar "${deleteTarget.titulo}"?`} confirmLabel="Borrar" confirmType="danger" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await axios.delete(`/api/propiedades/${deleteTarget.id}/`); setDeleteTarget(null); fetchProps(); setResult({ ok: true, msg: "Eliminada" }); }} />}
      {result && <ResultModal ok={result.ok} message={result.msg} onClose={() => setResult(null)} />}
    </div>
  );
}

function PropiedadDetailModal({ propiedad, onClose, onEdit, onDelete, onCopyTag }: any) {
  return (
    <Modal open={true} onClose={onClose} title="Detalle de Propiedad" maxWidth="2xl">
      <div className="flex flex-col gap-3 sm:gap-5 p-1">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-gray-200 dark:border-zinc-700 pb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {(() => {
                const coloresEstado: Record<string, string> = {
                  disponible: "bg-emerald-600 border-emerald-700 dark:bg-emerald-500 dark:border-emerald-400",
                  reservado: "bg-orange-500 border-orange-600 dark:bg-orange-500 dark:border-orange-400",
                  vendido: "bg-red-600 border-red-700 dark:bg-red-500 dark:border-red-400",
                };

                const colorClass = coloresEstado[propiedad.estado] || "bg-gray-600 border-gray-700";

                return (
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm border text-white ${colorClass}`}>
                    {propiedad.estado}
                  </span>
                );
              })()}

              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm
                        bg-blue-600 text-white border border-blue-700
                        dark:bg-blue-500 dark:text-white dark:border-blue-400">
                {propiedad.tipo_de_propiedad}
              </span>
            </div>
            {/* Título y Ubicación combinada */}
            <h2 className="text-base sm:text-lg font-black text-[var(--text-main)] leading-tight">
              {propiedad.titulo}
            </h2>
            <p className="text-sm font-black text-[var(--text-main)] leading-tight mt-1">
              {propiedad.ubicacion}

              {(propiedad.localidad || propiedad.barrio || propiedad.direccion) && (
                <span className="block text-xs font-normal text-[var(--muted)] mt-1">
                  {[propiedad.direccion, propiedad.barrio, propiedad.localidad].filter(Boolean).join(", ")}
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{money(propiedad.precio, propiedad.moneda)}</div>
            <button onClick={onCopyTag} className="text-[10px] font-mono font-bold text-gray-400 hover:text-black dark:hover:text-white transition-colors mt-1">#{propiedad.codigo}</button>
          </div>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="w-full h-[140px] sm:h-[300px] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
            <ThumbnailCarousel images={(propiedad.imagenes || []).map((x: any) => absMedia(x.imagen))} />
          </div>

          <div className="flex flex-col gap-2">

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <InfoBox label="Ambientes" value={propiedad.ambiente} icon="🏠" />
              <InfoBox label="Baños" value={propiedad.banos} icon="🚿" />
              <InfoBox label="Cocheras" value={propiedad.cocheras || 0} icon="🚗" />
              <InfoBox label="Superficie" value={`${propiedad.superficie} m²`} icon="📏" />
              <InfoBox label="Antigüedad" value={`${propiedad.antiguedad} años`} icon="⏳" />
            </div>

            {(propiedad.tiene_patio || propiedad.tiene_pileta || propiedad.tiene_quincho) && (
              <div className="flex flex-wrap gap-2 py-1">
                {propiedad.tiene_patio && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold uppercase flex items-center gap-1">🌿 Patio</span>}
                {propiedad.tiene_pileta && <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md text-[10px] font-bold uppercase flex items-center gap-1">🏊 Pileta</span>}
                {propiedad.tiene_quincho && <span className="px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 rounded-md text-[10px] font-bold uppercase flex items-center gap-1">🍖 Quincho</span>}
              </div>
            )}

            {/* Caja descripción */}
            <div className="flex-1 rounded-xl p-3 overflow-y-auto max-h-[120px] custom-scrollbar border
                bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]"
            >
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Descripción</h4>
              <p className="text-sm whitespace-pre-line leading-relaxed">{propiedad.descripcion || "Sin descripción."}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 sm:mt-4 pt-3 sm:pt-4 border-t rc-border flex justify-end gap-2">
        {onDelete && <button onClick={onDelete} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold border border-rose-600 text-rose-600 dark:text-rose-500 dark:border-rose-500 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all">Eliminar</button>}
        <button className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all" onClick={onClose}>Cerrar</button>
        <button className="px-4 py-1.5 sm:px-6 sm:py-2 rounded-lg text-xs font-bold border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 shadow-sm transition-all" onClick={onEdit}>Editar</button>
      </div>
    </Modal>
  );
}

function InfoBox({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg shadow-sm transition-all duration-300 group text-center h-full border
      bg-[var(--surface)] border-[var(--border)] text-[var(--text-main)]"
    >
      <div className="mb-1 sm:mb-3 text-[var(--muted)] group-hover:text-blue-500 group-hover:scale-110 transition-all text-lg sm:text-3xl">
        {icon}
      </div>
      <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[var(--muted)] truncate leading-none mb-1">
        {label}
      </span>
      <span className="text-sm sm:text-2xl font-bold text-[var(--text-main)] leading-none">
        {String(value)}
      </span>
    </div>
  );
}


function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg px-2.5 py-1.5 min-w-0 bg-white text-gray-900 border border-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800">
      <div className="text-[10px] rc-muted uppercase">{label}</div>
      <div className="text-sm">{String(value)}</div>
    </div>
  );
}


function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 block ml-1">{label}</label>
      <div>{children}</div>
    </div>
  );
}
function SelectScroll<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: T[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (ev: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full">
      <button type="button" onClick={() => setOpen(!open)}
        className="rc-input h-8 text-sm text-left flex items-center justify-between"
      >
        <span className="truncate capitalize">{value || "Seleccionar..."}</span>
        <span className="text-gray-400 text-xs">▼</span>
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden border rc-border bg-[var(--surface)] text-[var(--text-main)] max-h-[200px] overflow-y-auto">
          {options.map((opt) => (
            <li key={opt}>
              <button type="button" onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors capitalize ${opt === value
                  ? "bg-blue-600 text-white font-bold"
                  : "hover:bg-gray-100 dark:hover:bg-zinc-800"}`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


function PropiedadEditModal({ propiedad, onClose, onSaved }: any) {
  type FormState = Omit<Propiedad, "disponibilidad"> & { disponibilidad: "venta" | "alquiler" };

  const [form, setForm] = useState<FormState>({
    ...propiedad,
    localidad: propiedad.localidad || "",
    barrio: propiedad.barrio || "",
    direccion: propiedad.direccion || "",
    cocheras: propiedad.cocheras ?? 0,
    tiene_patio: !!propiedad.tiene_patio,
    tiene_pileta: !!propiedad.tiene_pileta,
    tiene_quincho: !!propiedad.tiene_quincho,
    disponibilidad: (propiedad.disponibilidad?.toLowerCase() as "venta" | "alquiler") ?? "venta",
  } as FormState);

  const [galeriaExistente, setGaleriaExistente] = useState<PropiedadImagen[]>(
    Array.isArray(propiedad.imagenes) ? propiedad.imagenes : []
  );
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f: FormState) => ({ ...f, [k]: v }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFilesArray = Array.from(selectedFiles);
      setFilesToUpload((prev) => [...prev, ...newFilesArray]);
      const newUrls = newFilesArray.map((f) => URL.createObjectURL(f));
      setNewPreviews((prev) => [...prev, ...newUrls]);
    }
    if (e.target) e.target.value = "";
  }

  function removeNewImage(index: number) {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function procederBorradoImagen() {
    if (imageToDelete === null) return;
    try {
      await axios.delete(`/api/propiedad-imagenes/${imageToDelete}/`);
      setGaleriaExistente((g) => g.filter((x) => x.id !== imageToDelete));
      setImageToDelete(null);
    } catch (e) {
      console.error(e);
      setError("No se pudo eliminar la imagen del servidor.");
      setImageToDelete(null);
    }
  }

  async function subirNuevasImagenes(propId: number) {
    if (filesToUpload.length === 0) return;
    const fd = new FormData();
    filesToUpload.forEach((f) => fd.append("imagenes", f));
    await axios.post(`/api/propiedades/${propId}/subir-imagenes/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        codigo: form.codigo,
        titulo: form.titulo,
        descripcion: form.descripcion,
        ubicacion: form.ubicacion,
        localidad: form.localidad,
        barrio: form.barrio,
        direccion: form.direccion,
        cocheras: Number(form.cocheras || 0),
        tiene_patio: form.tiene_patio,
        tiene_pileta: form.tiene_pileta,
        tiene_quincho: form.tiene_quincho,
        tipo_de_propiedad: form.tipo_de_propiedad,
        disponibilidad: asDisponibilidad(form.disponibilidad),
        precio: Number(form.precio),
        moneda: form.moneda,
        ambiente: Number(form.ambiente),
        antiguedad: Number(form.antiguedad),
        banos: Number(form.banos),
        superficie: Number(form.superficie),
        estado: form.estado,
      };

      await axios.patch(`/api/propiedades/${form.id}/`, payload);
      await subirNuevasImagenes(form.id);
      onSaved();
    } catch (e) {
      setError("No se pudo actualizar la propiedad. Verificá los datos.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "rc-input";

  return (
    <Modal open={true} onClose={onClose} title="Editar propiedad" maxWidth="xl">
      {error && (
        <div className="mb-3 rounded-md border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="max-h-none overflow-visible pr-2 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          {/* Formulario */}
          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-12 gap-3 content-start">
            <div className="col-span-12 sm:col-span-3">
              <Row label="Código">
                <input className={`${inputClass} font-mono`} value={form.codigo} onChange={(e) => set("codigo", e.target.value)} />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-9">
              <Row label="Título">
                <input className={inputClass} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
              </Row>
            </div>

            {/* Buscador  Ubicación */}
            <div className="col-span-12">
              <Row label="Buscador Inteligente de Ubicación">
                <Select
                  options={opcionesUbicacion}
                  placeholder="Empezá a escribir (Ej: Marcos Juárez)..."
                  noOptionsMessage={() => "No se encontraron localidades"}
                  onChange={(selectedItem: any) => {
                    if (selectedItem) {
                      set("ubicacion", selectedItem.value.ubicacionGeneral);
                      set("localidad", selectedItem.value.localidad);
                    }
                  }}
                  isClearable
                  styles={customSelectStyles}
                />
              </Row>
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Row label="Ubicación General *">
                <input className={inputClass} value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} placeholder="Provincia, Departamento" />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Row label="Localidad">
                <input className={inputClass} value={form.localidad || ""} onChange={(e) => set("localidad", e.target.value)} placeholder="Ej: Marcos Juárez" />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Row label="Barrio">
                <input className={inputClass} value={form.barrio || ""} onChange={(e) => set("barrio", e.target.value)} />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Row label="Dirección exacta">
                <input className={inputClass} value={form.direccion || ""} onChange={(e) => set("direccion", e.target.value)} placeholder="Ej: San Martín 123" />
              </Row>
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Row label="Tipo de propiedad">
                <SelectScroll
                  value={form.tipo_de_propiedad}
                  onChange={(v) => set("tipo_de_propiedad", v as any)}
                  options={[
                    "casa", "departamento", "ph", "terreno", "cochera", "local", "oficina",
                    "consultorio", "quinta", "chacra", "galpon", "deposito", "campo",
                    "hotel", "fondo de comercio", "edificio", "otro",
                  ]}
                />
              </Row>
            </div>
            <div className="col-span-12 sm:col-span-6">
              <Row label="Disponibilidad">
                <SelectScroll
                  value={form.disponibilidad}
                  onChange={(v) => set("disponibilidad", v as any)}
                  options={["venta", "alquiler"]}
                />
              </Row>
            </div>

            <div className="col-span-12 sm:col-span-5">
              <Row label="Precio">
                <input type="number" min={0} className={`${inputClass} font-medium`}
                  value={form.precio} onChange={(e) => set("precio", Number(e.target.value))} />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Moneda">
                <select className={inputClass}
                  value={form.moneda} onChange={(e) => set("moneda", e.target.value as "USD" | "ARS")}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-4">
              <Row label="Estado">
                <select
                  className={inputClass}
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value as "disponible" | "vendido" | "reservado")}
                >
                  <option value="disponible">Disponible</option>
                  <option value="reservado">Reservado</option>

                  <option value={form.disponibilidad === "alquiler" ? "alquilado" : "vendido"}>
                    {form.disponibilidad === "alquiler" ? "Alquilado" : "Vendido"}
                  </option>
                </select>
              </Row>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Row label="Ambientes">
                <select
                  className={inputClass}
                  value={form.ambiente}
                  onChange={(e) => set("ambiente", e.target.value === "" ? 0 : Number(e.target.value))}
                >
                  <option value="0">0</option>
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
                  value={form.banos}
                  onChange={(e) => set("banos", e.target.value === "" ? 0 : Number(e.target.value))}
                >
                  <option value="0">0</option>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num === 5 ? "5+" : num}
                    </option>
                  ))}
                </select>
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Antigüedad (años)">
                <input
                  type="number" min={0} className={inputClass}
                  value={form.antiguedad} onChange={(e) => set("antiguedad", Number(e.target.value))}
                />
              </Row>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Row label="Superficie (m²)">
                <input
                  type="number" min={0} step="0.01" className={inputClass}
                  value={form.superficie} onChange={(e) => set("superficie", Number(e.target.value))}
                />
              </Row>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <Row label="Cocheras">
                <select
                  className={inputClass}
                  value={form.cocheras ?? 0}
                  onChange={(e) => set("cocheras", Number(e.target.value))}
                >
                  <option value="0">0</option>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num === 5 ? "5+" : num}
                    </option>
                  ))}
                </select>
              </Row>
            </div>

            {/* Checkboxes  */}
            <div className="col-span-12 flex flex-wrap gap-6 mt-1 p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-200 dark:border-zinc-800">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={!!form.tiene_patio} onChange={e => set("tiene_patio", e.target.checked)} className="accent-blue-600 w-4 h-4 rounded" />
                Tiene Patio
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={!!form.tiene_pileta} onChange={e => set("tiene_pileta", e.target.checked)} className="accent-blue-600 w-4 h-4 rounded" />
                Tiene Pileta
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={!!form.tiene_quincho} onChange={e => set("tiene_quincho", e.target.checked)} className="accent-blue-600 w-4 h-4 rounded" />
                Tiene Quincho
              </label>
            </div>

            <div className="col-span-12">
              <Row label="Descripción">
                <textarea rows={4} className={`${inputClass} h-auto resize-none`} value={form.descripcion} onChange={e => set("descripcion", e.target.value)} />
              </Row>
            </div>
          </div>

          {/* Imágenes */}
          <div className="col-span-12 md:col-span-3 space-y-4 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 pl-0 md:pl-3">
            <div>
              <h3 className="font-medium mb-3 text-sm uppercase tracking-wider text-gray-500">Agregar Imágenes</h3>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 text-center transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30">
                <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full py-2">
                  <span className="text-sm font-medium text-blue-600 hover:underline">+ Seleccionar archivos</span>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              {filesToUpload.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-blue-600 mb-2">Nuevas ({filesToUpload.length})</div>
                  <ul className="grid grid-cols-3 md:grid-cols-2 gap-2">
                    {newPreviews.map((src, i) => (
                      <li key={i} className="relative group rounded overflow-hidden aspect-square border border-blue-200">
                        <img src={src} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeNewImage(i)} className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-5 h-5 md:w-4 md:h-4 flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm uppercase tracking-wider text-gray-500">Galería Actual</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {galeriaExistente.length}
                </span>
              </div>
              {galeriaExistente.length === 0 ? (
                <div className="text-xs rc-muted italic">Sin imágenes guardadas.</div>
              ) : (
                <ul className="grid grid-cols-3 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                  {galeriaExistente.map((img) => (
                    <li key={img.id} className="relative group rounded-lg overflow-hidden aspect-square border border-gray-200 dark:border-gray-800 shadow-sm">
                      <img src={absMedia(img.imagen) || ""} alt={`Galeria ${img.id}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20 flex items-start justify-end p-1">
                        <button
                          type="button"
                          onClick={() => setImageToDelete(img.id)}
                          className="p-1.5 rounded-full bg-red-500 text-white opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                          title="Eliminar permanentemente"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 mt-4 border-t rc-border bg-transparent flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-2">
        <button
          className="w-full sm:w-auto h-10 px-4 rounded-lg text-xs font-bold border border-zinc-400 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white transition-colors"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          className="w-full sm:w-auto px-6 py-2 h-10 rounded-xl text-sm font-bold border border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm transition-all disabled:opacity-50"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {imageToDelete !== null && (
        <ConfirmModal
          title="Eliminar imagen"
          message="¿Seguro de borrar esta imagen guardada? Esta acción es inmediata."
          confirmLabel="Eliminar"
          confirmType="danger"
          onCancel={() => setImageToDelete(null)}
          onConfirm={procederBorradoImagen}
        />
      )}
    </Modal>
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
      {/* Contenedor centrado */}
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
            <button className="px-4 py-2 rounded-xl text-sm font-bold border border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all" onClick={onCancel} disabled={working}>
              Cancelar
            </button>
            <button
              className={
                confirmType === "danger"
                  ? "h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 rc-text text-sm disabled:opacity-60"
                  : "h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 rc-text text-sm disabled:opacity-60"
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

function ResultModal({
  ok,
  message,
  onClose,
  autoCloseMs = 1500,
}: {
  ok: boolean;
  message: string;
  onClose: () => void;
  autoCloseMs?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [onClose, autoCloseMs]);


  return (

    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div
        className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg border text-sm font-medium
        ${ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"}`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-white text-xs
            ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
            aria-hidden
          >
            {ok ? "✓" : "!"}
          </span>
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}