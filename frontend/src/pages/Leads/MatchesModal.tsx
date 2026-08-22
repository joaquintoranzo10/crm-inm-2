import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { fetchMatchesForLead, type Propiedad } from "@/lib/api";

type Props = {
  contacto: {
    id: number;
    nombre?: string;
    apellido?: string;
    preferencias?: unknown[] | null;
  };
  onClose: () => void;
  onEditarPreferencia?: () => void;
};

function formatPrecio(p: Propiedad) {
  if (!p.precio) return "Precio a consultar";
  const num = Number(p.precio);
  const formateado = isNaN(num) ? p.precio : num.toLocaleString("es-AR");
  return `${p.moneda || ""} ${formateado}`;
}

export default function MatchesModal({ contacto, onClose, onEditarPreferencia }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    setError(null);
    fetchMatchesForLead(contacto.id)
      .then((data) => {
        if (activo) setPropiedades(data);
      })
      .catch((err) => {
        console.error(err);
        if (activo) setError("No se pudieron cargar las propiedades sugeridas.");
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [contacto.id]);

  const sinPreferencia = !contacto.preferencias || contacto.preferencias.length === 0;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Propiedades sugeridas para ${contacto.nombre || ""} ${contacto.apellido || ""}`.trim()}
      maxWidth="2xl"
    >
      {loading && <div className="text-sm text-muted-clr text-center py-8">Buscando coincidencias...</div>}

      {!loading && error && (
        <div className="text-sm text-rose-500 text-center py-8">{error}</div>
      )}

      {!loading && !error && sinPreferencia && (
        <div className="text-sm text-muted-clr text-center py-8 space-y-3">
          <p>Este lead todavía no tiene criterios de búsqueda cargados.</p>
          {onEditarPreferencia && (
            <button
              onClick={onEditarPreferencia}
              className="h-10 px-5 rounded-lg text-sm font-bold border border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 hover:bg-emerald-600 hover:text-white shadow-sm transition-all"
            >
              Cargar criterios de búsqueda
            </button>
          )}
        </div>
      )}

      {!loading && !error && !sinPreferencia && propiedades.length === 0 && (
        <div className="text-sm text-muted-clr text-center py-8">
          No encontramos propiedades disponibles que coincidan con los criterios de este lead por ahora.
        </div>
      )}

      {!loading && !error && propiedades.length > 0 && (
        <div className="space-y-3">
          {propiedades.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl bg-surface border border-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <div className="font-semibold text-base-clr">{p.titulo}</div>
                <div className="text-xs text-muted-clr">
                  {p.codigo} · {p.tipo_de_propiedad} · {p.ubicacion || "—"}
                </div>
                <div className="text-xs text-muted-clr mt-1">
                  {p.ambiente ? `${p.ambiente} amb.` : ""} {p.superficie ? `· ${p.superficie} m²` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-base-clr">{formatPrecio(p)}</div>
                <span className="inline-flex mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  {p.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm font-bold border border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
