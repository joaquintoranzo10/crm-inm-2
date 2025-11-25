import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import PropiedadCreateModal from "./PropiedadCreateModal";
import Modal from "@/components/Modal";
import clsx from "clsx";

// Tipo de imagen asociada a una propiedad
type PropiedadImagen = { id: number; imagen: string; descripcion?: string | null };

// Tipos posibles de propiedad 
type TipoProp =
  | "casa" | "departamento" | "ph" | "terreno" | "cochera" | "local" | "oficina"
  | "consultorio" | "quinta" | "chacra" | "galpon" | "deposito" | "campo"
  | "hotel" | "fondo de comercio" | "edificio" | "otro";

// Modelo principal de Propiedad 
type Propiedad = {
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


// Normaliza respuestas del backend para asegurar arrays
function toArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray(data.results)) return data.results as T[];
  return [];
}

// URL base del backend (usa variable de entorno o fallback local)
const BACKEND_ORIGIN =
  (import.meta as any).env?.VITE_BACKEND_ORIGIN || "http://127.0.0.1:8000";

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
  const base = "inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase bg-black/50 text-white backdrop-blur-sm border border-white/10";
  const label = tipo;
  return { className: base, label };
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
      <div className="relative flex-1 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 group">
        <img
          src={valid[i]}
          alt="Principal"
          className="w-full h-full object-cover" // 'cover' llena todo el cuadro, 'contain' muestra la foto entera sin cortar
        />

        {/* Flechas superpuestas (aparecen al pasar el mouse) */}
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
        <div className="h-16 w-full flex gap-2 overflow-x-auto pb-1 px-1 snap-x">
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

// Normaliza texto para búsquedas (minúsculas, sin tildes)
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

  const ITEM_H = 36;                // altura por item
  const maxH = ITEM_H * 4;          // 4 visibles

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
    return <div className="relative aspect-[16/9] bg-gray-200 dark:bg-gray-800 rounded-t-xl flex items-center justify-center text-gray-400 text-xs">Sin imagen</div>;
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
      className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-t-2xl group"
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

      {/* CONTROLES (Solo si hay más de 1 imagen) */}
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

  // Ejecuta fetchProps solo una vez al montar
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

  /*Principal (render)*/
  return (
    <div className="space-y-6">

      <style>{`
        .card_box {
          width: 100%;
          border-radius: 20px;
          background: linear-gradient(170deg, rgba(58, 56, 56, 0.623) 0%, rgb(31, 31, 31) 100%);
          position: relative;
          box-shadow: 0 25px 50px rgba(0,0,0,0.55);
          transition: all .3s;
          cursor: pointer; /* Asegura que el cursor sea una manito en toda la card */
        }
        .card_box:hover {
          transform: scale(0.95); 
          box-shadow: 0 15px 30px rgba(0,0,0,0.7);
        }
        
        .ribbon-wrapper {
          position: absolute;
          overflow: hidden;
          width: 120px;
          height: 120px;
          top: -10px;
          left: -10px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
          pointer-events: none;
        }
        .ribbon-content {
          position: absolute;
          width: 150%;
          height: 30px;
          background-image: linear-gradient(45deg, #ff6547 0%, #ffb144 51%, #ff7053 100%);
          transform: rotate(-45deg) translateY(-15px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          box-shadow: 0 5px 10px rgba(0,0,0,0.23);
        }
        .ribbon-wrapper::after {
          content: '';
          position: absolute;
          width: 10px;
          bottom: 0;
          left: 0;
          height: 10px;
          z-index: -1;
          box-shadow: 110px -110px #cc3f47; 
          background-image: linear-gradient(45deg, #FF512F 0%, #F09819 51%, #FF512F 100%);
        }
      `}</style>

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar..."
              className="rc-input h-10 w-64"
            />
            {q && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs rc-muted" onClick={() => setQ("")}>Limpiar</button>}
          </div>
          <button onClick={() => setOpenCreate(true)} className="inline-flex items-center rounded-md px-3 h-9 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
            Registrar propiedad
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm rc-muted">No hay propiedades que coincidan con tu búsqueda.</div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 [grid-template-columns:repeat(auto-fit,minmax(20rem,1fr))]">
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
                className="card_box flex flex-col"
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
                <div className="p-5 space-y-2 flex-1 text-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="text-xs text-gray-400">{p.ubicacion}</div>
                    {!!p.disponibilidad && <div className="text-[10px] uppercase font-bold text-orange-400 border border-orange-400/30 px-1.5 py-0.5 rounded">{p.disponibilidad}</div>}
                  </div>

                  <h3 className="font-bold text-lg leading-tight text-white">{p.titulo}</h3>
                  <div className="text-xl font-medium text-white">{money(p.precio, p.moneda)}</div>

                  {!!p.descripcion && (
                    <p className="text-xs text-gray-400 line-clamp-2">{p.descripcion}</p>
                  )}
                </div>

                {/* Footer de la card */}
                <div className="mt-auto px-5 py-4 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { k: "Amb", v: p.ambiente ?? "-" },
                      { k: "Baños", v: p.banos ?? "-" },
                      { k: "Antig", v: p.antiguedad ? `${p.antiguedad} Años` : "0 Años" },
                      { k: "Sup", v: `${p.superficie} m²` },
                      { k: "Cod", v: p.codigo },
                    ].map((it) => (
                      <div key={it.k} className="bg-white/5 rounded-lg px-1 py-1.5 text-center border border-white/5">
                        <div className="text-[9px] text-gray-500 uppercase">{it.k}</div>
                        <div className="text-xs font-bold text-gray-200 truncate">{it.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Botones 3D */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="flex-1 cursor-pointer transition-all bg-gray-600 text-white px-2 py-1.5 rounded-lg border-gray-700 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-[11px] font-bold text-center"
                      onClick={(e) => { e.stopPropagation(); setDetail(p); }} // stopPropagation para evitar doble evento, aunque es la misma acción
                    >
                      VER
                    </button>
                    <button
                      className="flex-1 cursor-pointer transition-all bg-blue-500 text-white px-2 py-1.5 rounded-lg border-blue-700 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-[11px] font-bold text-center"
                      onClick={(e) => { e.stopPropagation(); setEditTarget(p); }} // stopPropagation IMPORTANTE: Evita que se abra el "Ver" al querer editar
                    >
                      EDITAR
                    </button>
                    <button
                      className="flex-1 cursor-pointer transition-all bg-rose-500 text-white px-2 py-1.5 rounded-lg border-rose-700 border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-[11px] font-bold text-center"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }} // stopPropagation IMPORTANTE: Evita que se abra el "Ver" al querer borrar
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

      <PropiedadCreateModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={() => fetchProps()} />

      {detail && (
        <PropiedadDetailModal
          propiedad={detail}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditTarget(detail); setDetail(null); }}
          onDelete={() => { setDeleteTarget(detail); setDetail(null); }}
          onCopyTag={() => copyPropTag(detail)}
        />
      )}

      {editTarget && (
        <PropiedadEditModal
          propiedad={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchProps(); setResult({ ok: true, msg: "Propiedad actualizada." }); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Eliminar propiedad"
          message={`¿Seguro que querés eliminar "${deleteTarget.titulo}"?`}
          confirmLabel="Eliminar"
          confirmType="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await axios.delete(`/api/propiedades/${deleteTarget.id}/`);
              setDeleteTarget(null);
              await fetchProps();
              setResult({ ok: true, msg: "Eliminada." });
            } catch {
              setResult({ ok: false, msg: "Error al eliminar." });
            }
          }}
        />
      )}

      {result && <ResultModal ok={result.ok} message={result.msg} onClose={() => setResult(null)} />}
    </div>
  );
}

function PropiedadDetailModal({ propiedad, onClose, onEdit, onDelete, onCopyTag }: any) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return 'bg-green-100 text-green-900 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800';
      case 'reservado':
        return 'bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-800';
      case 'vendido':
        return 'bg-red-100 text-red-900 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700';
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={propiedad.titulo} maxWidth="4xl">

      <div className="max-h-[75vh] overflow-y-auto px-1 pb-4 custom-scrollbar">


        {/* CABECERA */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">

          {/* Ubicación*/}
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="font-bold text-xl" style={{ color: 'var(--text)' }}>
              {propiedad.ubicacion}
            </span>
          </div>


          <div className="flex items-center gap-2">
            <button
              onClick={onCopyTag}
              style={{ backgroundColor: 'var(--text)', color: 'var(--surface)' }}
              className="px-3 py-1.5 rounded text-sm font-mono font-bold hover:opacity-80 transition-opacity shadow-sm"
              title="Copiar ID"
            >
              #{propiedad.codigo}
            </button>
          </div>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* FOTOS */}
          <div className="flex flex-col gap-4">
            <div className="w-full h-[300px] rounded-xl overflow-hidden">
              <ThumbnailCarousel images={(propiedad.imagenes || []).map((x: any) => absMedia(x.imagen))} />
            </div>
          </div>

          {/*DATOS */}
          <div className="flex flex-col h-full">

            {/* PRECIO */}
            <div className="mb-2">
              <span className="text-5xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                {money(propiedad.precio, propiedad.moneda)}
              </span>
            </div>

            {/*  VENTA  */}
            <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-gray-700 pb-2">
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {propiedad.disponibilidad}
              </span>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getEstadoColor(propiedad.estado)}`}>
                  {propiedad.estado}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800">
                  {propiedad.tipo_de_propiedad}
                </span>
              </div>
            </div>

            {/*  LAS 4 CAJAS */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <InfoBoxDark
                label="Ambientes"
                value={propiedad.ambiente || "-"}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
              />
              <InfoBoxDark
                label="Baños"
                value={propiedad.banos || "-"}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 15h16c0 1.657-1.343 3-3 3H7c-1.657 0-3-1.343-3-3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 15V13h16v2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18l-1 2m14-2l1 2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 13V6a3 3 0 013-3h4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3v2a2 2 0 01-2 2h-2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 9v1m2 1v1m-4-1v1" />
                  </svg>
                }
              />
              <InfoBoxDark
                label="Sup. Total"
                value={`${propiedad.superficie} m²`}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
              />
              <InfoBoxDark
                label="Antigüedad"
                value={propiedad.antiguedad ? `${propiedad.antiguedad} años` : "A estrenar"}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </div>

            {/* DESCRIPCIÓN */}
            <div className="pl-3 border-l-4 border-gray-300 dark:border-gray-600">
              <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
                Descripción
              </h4>
              <p className="text-sm leading-relaxed font-medium whitespace-pre-line" style={{ color: 'var(--text)', opacity: 0.8 }}>
                {propiedad.descripcion || "Sin descripción disponible."}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/*  BOTONES */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">

        {onDelete && (
          <button
            onClick={onDelete}
            className="h-10 px-5 rounded-lg text-sm font-bold transition-all border border-red-600 text-red-600 dark:text-red-500 dark:border-red-500 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white"
          >
            Eliminar
          </button>
        )}

        <button
          className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white"
          onClick={onClose}
        >
          Cerrar
        </button>

        <button
          className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white shadow-sm"
          onClick={onEdit}
        >
          Editar
        </button>

      </div>

    </Modal>
  );
}


// Caja oscura para datos 
function InfoBoxDark({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center px-4 py-3 rounded-lg shadow-sm
      bg-[#2d3748] text-white border border-gray-600 relative overflow-hidden">

      <div className="flex items-center gap-2 mb-1 z-10">
        {icon && <span className="text-blue-400 opacity-90">{icon}</span>}
        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-300">
          {label}
        </span>
      </div>

      <span className="text-xl font-bold leading-none truncate text-white z-10 pl-1">
        {String(value)}
      </span>

      <div className="absolute -right-2 -bottom-4 text-white opacity-5 transform rotate-12 scale-150 pointer-events-none">
        {icon}
      </div>
    </div>
  );
}

/*Subcomponente Info */
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

function PropiedadEditModal({ propiedad, onClose, onSaved }: any) {
  type FormState = Omit<Propiedad, "disponibilidad"> & { disponibilidad: "venta" | "alquiler" };

  const [form, setForm] = useState<FormState>({
    ...propiedad,
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
      setImageToDelete(null); // Cierra el modal
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

  const inputClass = "rc-input h-10 w-full px-3 py-2 text-sm leading-tight focus:outline-none bg-white border border-gray-300 rounded-lg text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  return (
    <Modal open={true} onClose={onClose} title="Editar propiedad" maxWidth="4xl">
      {error && (
        <div className="mb-3 rounded-md border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar pb-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* Formulario */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-12 gap-5 content-start">
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
            <div className="col-span-12">
              <Row label="Ubicación">
                <input className={inputClass} value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} />
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
                <select
                  className={inputClass}
                  value={form.disponibilidad}
                  onChange={(e) => set("disponibilidad", asDisponibilidad(e.target.value))}
                >
                  <option value="venta">Venta</option>
                  <option value="alquiler">Alquiler</option>
                </select>
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
                  className={`${inputClass} font-medium`}
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value as "disponible" | "vendido" | "reservado")}
                >
                  <option value="disponible">Disponible</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
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
                  value={form.banos}
                  onChange={(e) => set("banos", e.target.value === "" ? 0 : Number(e.target.value))}
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
            <div className="col-span-12">
              <Row label="Descripción">
                <textarea rows={4} className="rc-input w-full p-3 text-sm resize-none" value={form.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} />
              </Row>
            </div>
          </div>

          {/*  Imágenes */}
          <div className="md:col-span-4 space-y-6 border-l border-gray-100 dark:border-gray-800 pl-8 md:block hidden">

            {/* Subir Nuevas */}
            <div>
              <h3 className="font-medium mb-3 text-sm uppercase tracking-wider text-gray-500">Agregar Imágenes</h3>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 text-center transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30">
                <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full py-2">
                  <span className="text-sm font-medium text-blue-600 hover:underline">+ Seleccionar archivos</span>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              {/* Previews */}
              {filesToUpload.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-blue-600 mb-2">Nuevas ({filesToUpload.length})</div>
                  <ul className="grid grid-cols-3 gap-2">
                    {newPreviews.map((src, i) => (
                      <li key={i} className="relative group rounded overflow-hidden aspect-square border border-blue-200">
                        <img src={src} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeNewImage(i)} className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center">x</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Galería Existente */}
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
                <ul className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                  {galeriaExistente.map((img) => (
                    <li key={img.id} className="relative group rounded-lg overflow-hidden aspect-square border border-gray-200 dark:border-gray-800 shadow-sm">
                      <img src={img.imagen} alt={`Galeria ${img.id}`} className="w-full h-full object-cover" />


                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20 flex items-start justify-end p-1">
                        <button
                          type="button"
                          onClick={() => setImageToDelete(img.id)}
                          className="p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
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

          {/* Versión móvil */}
          <div className="md:hidden col-span-12 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <label className="text-sm font-medium">Gestión de Imágenes</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200"
              onChange={handleFileChange}
            />
            {(filesToUpload.length > 0 || galeriaExistente.length > 0) && (
              <p className="text-xs rc-muted mt-2">
                {galeriaExistente.length} guardadas + {filesToUpload.length} nuevas seleccionadas.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t rc-border bg-transparent flex items-center justify-end gap-2">
        <button
          className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>


      {imageToDelete !== null && (
        <ConfirmModal
          title="Eliminar imagen"
          message="¿Estás seguro de borrar esta imagen guardada? Esta acción es inmediata."
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
            <button className="h-9 px-3 rounded-lg border text-sm" onClick={onCancel} disabled={working}>
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