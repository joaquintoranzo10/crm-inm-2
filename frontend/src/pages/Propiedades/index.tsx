import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import PropiedadCreateModal from "./PropiedadCreateModal";
import Modal from "@/components/Modal";


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
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-white";
  const label =
    tipo === "casa" ? "Casa" : tipo === "departamento" ? "Departamento" : tipo;
  return { className: base, label };
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

/* carrusel simple para mostrar imágenes */

function CardCarousel({ images }: { images: (string | null | undefined)[] }) {
  const valid = images.filter(Boolean) as string[];
  const [i, setI] = useState(0);
  const len = valid.length;

  if (len === 0) {
    return <div className="relative aspect-[16/9] bg-gray-200 dark:bg-gray-800 rounded-t-xl" />;
  }

  const prev = () => setI((v) => (v - 1 + len) % len);
  const next = () => setI((v) => (v + 1) % len);

  // swipe en móvil
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
      className="relative aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-t-xl"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        key={valid[i]}
        src={valid[i]}
        alt={`Imagen ${i + 1} de ${len}`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />

      {len > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full grid place-items-center bg-black/40 hover:bg-black/60 text-white"
            aria-label="Anterior"
          >‹</button>

          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full grid place-items-center bg-black/40 hover:bg-black/60 text-white"
            aria-label="Siguiente"
          >›</button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {valid.map((_, idx) => (
              <span key={idx} className={`h-1.5 w-1.5 rounded-full ${idx === i ? "bg-white" : "bg-white/50"}`} />
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
  const [q, setQ] = useState(""); // búsqueda
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

  /* Copiar etiqueta tipo @Propiedad 12 */
  async function copyPropTag(p: Propiedad) {
    const tag = `@Propiedad ${p.id}`;
    try {
      await navigator.clipboard.writeText(tag);
      setResult({ ok: true, msg: `Copiado: ${tag}` });
    } catch {
      setResult({ ok: false, msg: "No se pudo copiar al portapapeles." });
    }
  }

  /* Búsqueda inteligente (filtra client-side) */
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
    <div className="space-y-4">
      {/* 🔹 Barra superior con buscador y botón de registro */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Propiedades</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por título, ubicación o código…"
              className="rc-input h-10 w-full"
            />
            {q && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs rc-muted"
                onClick={() => setQ("")}
              >
                Limpiar
              </button>
            )}
          </div>
          <button
            onClick={() => setOpenCreate(true)}
            className="inline-flex items-center rounded-md px-3 h-9 text-sm font-medium bg-blue-600 rc-text hover:bg-blue-700"
          >
            Registrar propiedad
          </button>
        </div>
      </div>

      {/* Cuerpo de la página */}
      {loading ? (
        <div className="text-sm">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm rc-muted">No hay propiedades que coincidan con tu búsqueda.</div>
      ) : (
        /* Grilla de cards de propiedad */
        // CAMBIO: Se eliminó 'grid-cols-1' redundante
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 [grid-template-columns:repeat(auto-fit,minmax(22rem,1fr))]">
          {filtered.map((p) => {
            const img = firstImage(p);
            const tipo = badgeTipo(p.tipo_de_propiedad);
            return (
              <article
                key={p.id}
                className="rc-card rc-text border rc-border rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
                >
                {/* Imagen superior */}
                <div className="relative">
                  <CardCarousel images={(p.imagenes || []).map(x => absMedia(x.imagen))} />
                  <div className="absolute top-2 left-2 flex gap-2 pointer-events-none">
                    <span className={tipo.className}>{tipo.label}</span>
                    <span className={badgeEstado(p.estado)}>
                      {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Cuerpo con título y descripción */}
                <div className="p-4 space-y-1.5">
                  <div className="text-sm rc-muted">{p.ubicacion}</div>
                  <h3 className="font-semibold leading-snug">{p.titulo}</h3>
                  <div className="text-sm">{money(p.precio, p.moneda)}</div>
                  {!!p.disponibilidad && (
                    <div className="text-xs rc-muted capitalize">{p.disponibilidad}</div>
                  )}
                  {!!p.descripcion && (
                    <p className="text-xs rc-muted line-clamp-2">{p.descripcion}</p>
                  )}
                </div>

                {/* Footer de la card */}
                <div className="mt-auto px-4 py-3 border-t rc-border">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {[
                      { k: "AMBIENTES",  v: p.ambiente ?? "—" },
                      { k: "BAÑOS",      v: p.banos ?? "—" },
                      { k: "SUPERFICIE", v: `${p.superficie} m²` },
                      { k: "ANTIGÜEDAD", v: p.antiguedad != null ? `${p.antiguedad} años` : "—" },
                      { k: "CÓDIGO",     v: p.codigo },
                      { k: "MONEDA",     v: p.moneda },
                      ].map((it) => (
                        <div key={it.k} className="rounded-lg px-2.5 py-1.5 min-w-0 bg-white text-gray-900 border border-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800">
                          <div className="text-[10px] rc-muted uppercase">{it.k}</div>
                          <div className="text-[12px] font-medium truncate">{it.v}</div>
                        </div>
                      ))}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <button className="h-9 px-3 rounded-md border rc-border text-xs" onClick={() => setDetail(p)}>Ver</button>
                    <button className="h-9 px-3 rounded-md border rc-border text-xs" onClick={() => setEditTarget(p)}>Editar</button>
                    <button className="h-9 px-3 rounded-md border text-xs border-rose-600 text-rose-600 dark:border-rose-500 dark:text-rose-400"
                            onClick={() => setDeleteTarget(p)}>
                      Borrar
                    </button>
                    {/* CAMBIO: Botón @Propiedad X eliminado */}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal: Crear nueva propiedad*/}
      <PropiedadCreateModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={() => fetchProps()} />

      {/* === Modal: Ver detalle === */}
      {detail && (
        <PropiedadDetailModal
          propiedad={detail}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditTarget(detail); setDetail(null); }}
          onDelete={() => { setDeleteTarget(detail); setDetail(null); }}
          onCopyTag={() => copyPropTag(detail)}
        />
      )}

      {/*Modal: Editar propiedad*/}
      {editTarget && (
        <PropiedadEditModal
          propiedad={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchProps(); setResult({ ok: true, msg: "Propiedad actualizada." }); }}
        />
      )}

      {/* Modal: Confirmar eliminación */}
      {deleteTarget && (
        <ConfirmModal
          title="Eliminar propiedad"
          message={`¿Seguro que querés eliminar "${deleteTarget.titulo}" (cód: ${deleteTarget.codigo})? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          confirmType="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await axios.delete(`/api/propiedades/${deleteTarget.id}/`);
              setDeleteTarget(null);
              await fetchProps();
              setResult({ ok: true, msg: "Propiedad eliminada." });
            } catch {
              setResult({ ok: false, msg: "No se pudo eliminar la propiedad." });
            }
          }}
        />
      )}

      {/* Modal: Resultado de acciones */}
      {result && (
        <ResultModal
          ok={result.ok}
          message={result.msg}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
}

/*PropiedadDetailModal – Modal de Detalle */

function PropiedadDetailModal({ propiedad, onClose, onEdit, onDelete, onCopyTag }: any) {
  const imgs = (propiedad.imagenes || []).map((x: any) => absMedia(x.imagen)).filter(Boolean);
  const [active, setActive] = useState(0);

  return (
    <Modal open={true} onClose={onClose} title={propiedad.titulo} maxWidth="lg">
      <div className="text-xs rc-muted mb-4">{propiedad.ubicacion}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Imagen principal (Carrusel) */}
        <div className="rounded-xl overflow-hidden border h-64 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          {/* CAMBIO: Se reemplazó la imagen simple por el componente CardCarousel */}
          <CardCarousel images={(propiedad.imagenes || []).map((x: PropiedadImagen) => absMedia(x.imagen))} />
        </div>

        {/* Datos */}
        <div className="space-y-2">
          <div className="text-2xl font-semibold">
            {money(propiedad.precio, propiedad.moneda)}
          </div>

          <div className="flex gap-2">
            <span className={badgeEstado(propiedad.estado)}>{propiedad.estado}</span>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-white">
              {propiedad.tipo_de_propiedad}
            </span>
            {propiedad.disponibilidad && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {propiedad.disponibilidad}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
            <Info label="Ambientes" value={propiedad.ambiente} />
            <Info label="Baños" value={propiedad.banos} />
            <Info label="Superficie" value={`${propiedad.superficie} m²`} />
            <Info label="Antigüedad" value={`${propiedad.antiguedad} años`} />
            <Info label="Código" value={propiedad.codigo} />
            <Info label="Moneda" value={propiedad.moneda} />
          </div>

          {propiedad.descripcion && (
            <div className="mt-3 text-sm rc-muted dark:text-gray-300">
              {propiedad.descripcion}
            </div>
          )}
          
          {/* CAMBIO: Miniaturas eliminadas (ahora están en el carrusel) */}
        </div>
      </div>

      {/* Footer de acciones */}
      {/* CAMBIO: Botón 'Copiar' eliminado */}
      <div className="mt-5 flex items-center justify-end gap-2">
        <button className="h-9 px-3 rounded-lg border text-sm" onClick={onEdit}>Editar</button>
        <button className="h-9 px-3 rounded-lg border border-rose-600/40 text-rose-500 text-sm" onClick={onDelete}>Borrar</button>
        <button className="h-9 px-3 rounded-lg border text-sm" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}

/*Subcomponente Info (usado dentro del DetailModal) */
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



function PropiedadEditModal({ propiedad, onClose, onSaved }: any) {
  type FormState = Omit<Propiedad, "disponibilidad"> & { disponibilidad: "venta" | "alquiler" };
  const [form, setForm] = useState<FormState>({
    ...propiedad,
    disponibilidad: (propiedad.disponibilidad?.toLowerCase() as "venta" | "alquiler") ?? "venta",
  } as FormState);

  //  Muestra galeria existente + archivos nuevos
  const [galeria, setGaleria] = useState<PropiedadImagen[]>(
    Array.isArray(propiedad.imagenes) ? propiedad.imagenes : []
  );
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f: FormState) => ({ ...f, [k]: v }));
  }
  // Para borrar 1 imagen existente
  async function eliminarImagen(imgId: number) {
    try {
      await axios.delete(`/api/propiedades/imagenes/${imgId}/`);
      setGaleria((g) => g.filter((x) => x.id !== imgId));
    } catch (e) {
      setError("No se pudo eliminar la imagen.");
    }
  }

  // subir imágenes nuevas (múltiples)
  async function subirNuevasImagenes(propId: number) {
    const flist = fileRef.current?.files;
    if (!flist || flist.length === 0) return;

    const fd = new FormData();
    Array.from(flist).forEach((f) => fd.append("imagenes", f));
    await axios.post(`/api/propiedades/${propId}/subir-imagenes/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // limpiar input
    if (fileRef.current) fileRef.current.value = "";
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
      setError("No se pudo guardar la propiedad. Verificá los datos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Editar propiedad" maxWidth="lg">
      {error && (
        <div className="mb-3 rounded-md border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Cuerpo con scroll y footer para que se vean los botones */}
      <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Formulario */}
          <div className="md:col-span-7 space-y-3">
            <Row label="Código">
              <input className="rc-input h-10 w-full" value={form.codigo} onChange={(e) => set("codigo", e.target.value)} />
            </Row>

            <Row label="Título">
              <input className="rc-input h-10 w-full" value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
            </Row>

            <Row label="Ubicación">
              <input className="rc-input h-10 w-full" value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} />
            </Row>

            <Row label="Descripción">
              <textarea rows={3} className="rc-input w-full" value={form.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} />
            </Row>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Row label="Tipo de propiedad">
                <select
                  className="rc-input h-10 w-full"
                  value={form.tipo_de_propiedad}
                  onChange={(e) => set("tipo_de_propiedad", e.target.value as any)}
                >
                  {[
                    "casa","departamento","ph","terreno","cochera","local","oficina","consultorio",
                    "quinta","chacra","galpon","deposito","campo","hotel","fondo de comercio","edificio","otro",
                  ].map((v) => (<option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>))}
                </select>
              </Row>

              <Row label="Disponibilidad">
                <select
                  className="rc-input h-10 w-full"
                  value={form.disponibilidad}
                  onChange={(e) => set("disponibilidad", asDisponibilidad(e.target.value))}
                >
                  <option value="venta">Venta</option>
                  <option value="alquiler">Alquiler</option>
                </select>
              </Row>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Row label="Precio">
                <input type="number" min={0} className="rc-input h-10 w-full"
                  value={form.precio} onChange={(e) => set("precio", Number(e.target.value))} />
              </Row>
              <Row label="Moneda">
                <select className="rc-input h-10 w-full"
                  value={form.moneda} onChange={(e) => set("moneda", e.target.value as "USD" | "ARS")}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </Row>
              <Row label="Ambientes">
                <input type="number" min={0} className="rc-input h-10 w-full"
                  value={form.ambiente} onChange={(e) => set("ambiente", Number(e.target.value))} />
              </Row>
              <Row label="Baños">
                <input type="number" min={0} className="rc-input h-10 w-full"
                  value={form.banos} onChange={(e) => set("banos", Number(e.target.value))} />
              </Row>
              <Row label="Antigüedad">
                <input
                  type="number"
                  min={0}
                  className="rc-input h-10 w-full"
                  value={form.antiguedad}
                  onChange={(e) => set("antiguedad", Number(e.target.value))}
                />
              </Row>

              <Row label="Superficie (m²)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="rc-input h-10 w-full"
                  value={form.superficie}
                  onChange={(e) => set("superficie", Number(e.target.value))}
                />
              </Row>

              <Row label="Estado">
                <select
                  className="rc-input h-10 w-full min-w-[160px]"
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value as "disponible" | "vendido" | "reservado")}
                >
                  <option value="disponible">Disponible</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                </select>
              </Row>
            </div>
          </div>

          {/* Se edita Imagenes: nuevas + galeria existente */}
          <div className="md:col-span-5 space-y-3">
            <div>
              <label className="text-sm">Agregar imágenes nuevas (múltiples)</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-200"
              />
              <p className="text-xs rc-muted">Se agregan a la galería al guardar.</p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Imágenes actuales</label>
                <span className="text-xs rc-muted">{galeria.length} imagen(es)</span>
              </div>

              {galeria.length === 0 ? (
                <div className="mt-2 text-xs rc-muted">No hay imágenes cargadas.</div>
              ) : (
                <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {galeria.map((img) => (
                    <li key={img.id} className="relative group">
                      <img
                        src={img.imagen}
                        alt={img.descripcion || `Imagen ${img.id}`}
                        className="h-28 w-full object-cover rounded-md border border-gray-200 dark:border-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() => eliminarImagen(img.id)}
                        className="absolute top-1 right-1 text-[11px] px-2 py-1 rounded bg-red-600 text-white opacity-90 hover:opacity-100"
                        title="Eliminar imagen"
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer siempre visible */}
      <div className="pt-3 border-t rc-border bg-transparent flex items-center justify-end gap-2">
        <button className="h-10 px-4 rounded-lg border text-sm" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button
          className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 rc-text text-sm disabled:opacity-60"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
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
    // CAMBIO: z-[10000] -> z-50 (un z-index alto estándar)
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
    // CAMBIO: z-[10000] -> z-50
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