import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import PropiedadCard from "@/components/PropiedadCard";
import { PropiedadDetailModal } from "@/pages/Propiedades";
import EventCreateModal from "./EventCreateModal";
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

export default function MatchesModal({ contacto, onClose, onEditarPreferencia }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [detalle, setDetalle] = useState<Propiedad | null>(null);
  const [eventoPropiedadId, setEventoPropiedadId] = useState<number | null>(null);

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
      maxWidth="5xl"
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
        <div className="flex flex-wrap gap-4 sm:gap-5">
          {propiedades.map((p) => (
            <div key={p.id} className="w-full sm:w-[280px]">
              <PropiedadCard propiedad={p} onVer={() => setDetalle(p)} />
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

      {detalle && (
        <PropiedadDetailModal
          propiedad={detalle}
          onClose={() => setDetalle(null)}
          onCrearEvento={() => {
            setEventoPropiedadId(detalle.id);
            setDetalle(null);
          }}
        />
      )}

      {eventoPropiedadId != null && (
        <EventCreateModal
          open={true}
          presetContacto={contacto}
          presetPropiedadId={eventoPropiedadId}
          onClose={() => setEventoPropiedadId(null)}
          onCreated={() => setEventoPropiedadId(null)}
        />
      )}
    </Modal>
  );
}

