import { useState } from "react";
import Modal from "@/components/Modal";
import { toast } from "react-hot-toast";
import {
  updatePreferenciaLead,
  clearPreferenciaLead,
  type PreferenciaBusqueda,
  type TipoPropiedad,
} from "@/lib/api";

const TIPOS_PROPIEDAD: { value: TipoPropiedad; label: string }[] = [
  { value: "casa", label: "Casa" },
  { value: "departamento", label: "Departamento" },
  { value: "ph", label: "PH" },
  { value: "terreno", label: "Terreno" },
  { value: "cochera", label: "Cochera" },
  { value: "local", label: "Local" },
  { value: "oficina", label: "Oficina" },
  { value: "consultorio", label: "Consultorio" },
  { value: "quinta", label: "Quinta" },
  { value: "chacra", label: "Chacra" },
  { value: "galpon", label: "Galpón" },
  { value: "deposito", label: "Depósito" },
  { value: "campo", label: "Campo" },
  { value: "hotel", label: "Hotel" },
  { value: "fondo de comercio", label: "Fondo de Comercio" },
  { value: "edificio", label: "Edificio" },
  { value: "otro", label: "Otro" },
];

type Props = {
  contacto: {
    id: number;
    nombre?: string;
    apellido?: string;
    preferencia?: PreferenciaBusqueda | null;
  };
  onClose: () => void;
  onSaved?: () => void;
};

const inputClass =
  "mt-1 w-full border rounded-md px-3 py-2 bg-app dark:bg-gray-950 border-soft dark:border-gray-700";

export default function PreferenciaModal({ contacto, onClose, onSaved }: Props) {
  const pref = contacto.preferencia;

  const [tipo, setTipo] = useState<TipoPropiedad | "">(pref?.tipo_de_propiedad || "");
  const [localidad, setLocalidad] = useState(pref?.localidad || "");
  const [barrio, setBarrio] = useState(pref?.barrio || "");
  const [presupuestoMin, setPresupuestoMin] = useState(
    pref?.presupuesto_min != null ? String(pref.presupuesto_min) : ""
  );
  const [presupuestoMax, setPresupuestoMax] = useState(
    pref?.presupuesto_max != null ? String(pref.presupuesto_max) : ""
  );
  const [moneda, setMoneda] = useState<"USD" | "ARS">(pref?.moneda || "USD");
  const [ambientesMin, setAmbientesMin] = useState(
    pref?.ambientes_min != null ? String(pref.ambientes_min) : ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload: PreferenciaBusqueda = {
        tipo_de_propiedad: tipo || "",
        localidad: localidad.trim(),
        barrio: barrio.trim(),
        presupuesto_min: presupuestoMin ? Number(presupuestoMin) : null,
        presupuesto_max: presupuestoMax ? Number(presupuestoMax) : null,
        moneda,
        ambientes_min: ambientesMin ? Number(ambientesMin) : null,
      };
      await updatePreferenciaLead(contacto.id, payload);
      toast.success("Criterios de búsqueda guardados.");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar los criterios de búsqueda.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await clearPreferenciaLead(contacto.id);
      toast.success("Criterios de búsqueda eliminados.");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar los criterios de búsqueda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Qué busca ${contacto.nombre || ""} ${contacto.apellido || ""}`.trim()}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-clr">
          Estos criterios se usan para sugerir propiedades que coincidan con lo que busca el lead.
          Dejá en blanco lo que no aplique.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Tipo de propiedad</label>
            <select
              className={inputClass}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoPropiedad | "")}
            >
              <option value="">Cualquiera</option>
              {TIPOS_PROPIEDAD.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Ambientes mínimos</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={ambientesMin}
              onChange={(e) => setAmbientesMin(e.target.value)}
              placeholder="Ej: 2"
            />
          </div>

          <div>
            <label className="text-sm">Localidad</label>
            <input
              type="text"
              className={inputClass}
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              placeholder="Ej: Marcos Juárez"
            />
          </div>

          <div>
            <label className="text-sm">Barrio</label>
            <input
              type="text"
              className={inputClass}
              value={barrio}
              onChange={(e) => setBarrio(e.target.value)}
              placeholder="Ej: Centro"
            />
          </div>

          <div>
            <label className="text-sm">Presupuesto mínimo</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={presupuestoMin}
              onChange={(e) => setPresupuestoMin(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-sm">Presupuesto máximo</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={presupuestoMax}
              onChange={(e) => setPresupuestoMax(e.target.value)}
              placeholder="Sin límite"
            />
          </div>

          <div>
            <label className="text-sm">Moneda</label>
            <select
              className={inputClass}
              value={moneda}
              onChange={(e) => setMoneda(e.target.value as "USD" | "ARS")}
            >
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 sm:gap-2">
        {pref && (
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="w-full sm:w-auto h-10 px-4 rounded-lg border text-sm text-gray-700 dark:text-gray-300 border-soft dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60"
          >
            Eliminar criterios
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold border border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full sm:w-auto h-10 px-6 rounded-lg text-sm font-bold transition-all border border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white shadow-sm"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}
