import { useState } from "react";
import Modal from "@/components/Modal";
import { toast } from "react-hot-toast";
import {
  updatePreferenciasLead,
  clearPreferenciasLead,
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
    preferencias?: PreferenciaBusqueda[];
  };
  onClose: () => void;
  onSaved?: () => void;
};

const inputClass =
  "mt-1 w-full border rounded-md px-3 py-2 bg-app dark:bg-gray-950 border-soft dark:border-gray-700";

type ItemEditable = PreferenciaBusqueda & { _key: string };

let contador = 0;
function nuevaKey() {
  contador += 1;
  return `nuevo-${contador}`;
}

function itemVacio(): ItemEditable {
  return {
    _key: nuevaKey(),
    etiqueta: "",
    tipo_de_propiedad: "",
    operacion: "",
    localidad: "",
    barrio: "",
    presupuesto_min: null,
    presupuesto_max: null,
    moneda: "USD",
    ambientes_min: null,
  };
}

function aItemEditable(p: PreferenciaBusqueda): ItemEditable {
  return {
    _key: p.id ? `id-${p.id}` : nuevaKey(),
    id: p.id,
    etiqueta: p.etiqueta || "",
    tipo_de_propiedad: p.tipo_de_propiedad || "",
    operacion: p.operacion || "",
    localidad: p.localidad || "",
    barrio: p.barrio || "",
    presupuesto_min: p.presupuesto_min ?? null,
    presupuesto_max: p.presupuesto_max ?? null,
    moneda: p.moneda || "USD",
    ambientes_min: p.ambientes_min ?? null,
  };
}

function tituloItem(item: ItemEditable, index: number) {
  return item.etiqueta?.trim() || `Criterio ${index + 1}`;
}

export default function PreferenciaModal({ contacto, onClose, onSaved }: Props) {
  const existentes = contacto.preferencias || [];

  const [items, setItems] = useState<ItemEditable[]>(
    existentes.length > 0 ? existentes.map(aItemEditable) : [itemVacio()]
  );
  const [abierto, setAbierto] = useState<string | null>(items[0]?._key ?? null);
  const [saving, setSaving] = useState(false);

  function actualizarItem(key: string, cambios: Partial<ItemEditable>) {
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...cambios } : it)));
  }

  function agregarCriterio() {
    const nuevo = itemVacio();
    setItems((prev) => [...prev, nuevo]);
    setAbierto(nuevo._key);
  }

  function eliminarCriterio(key: string) {
    setItems((prev) => prev.filter((it) => it._key !== key));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload: PreferenciaBusqueda[] = items.map((it) => ({
        id: it.id,
        etiqueta: (it.etiqueta || "").trim(),
        tipo_de_propiedad: it.tipo_de_propiedad || "",
        operacion: it.operacion || "",
        localidad: (it.localidad || "").trim(),
        barrio: (it.barrio || "").trim(),
        presupuesto_min: it.presupuesto_min || null,
        presupuesto_max: it.presupuesto_max || null,
        moneda: it.moneda || "USD",
        ambientes_min: it.ambientes_min || null,
      }));
      await updatePreferenciasLead(contacto.id, payload);
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

  async function handleClearAll() {
    setSaving(true);
    try {
      await clearPreferenciasLead(contacto.id);
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

  const hayAlgunoExistente = existentes.length > 0;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Qué busca ${contacto.nombre || ""} ${contacto.apellido || ""}`.trim()}
      maxWidth="lg"
    >
      <div className="space-y-4">
        
        <div className="space-y-3">
          {items.map((item, index) => {
            const estaAbierto = abierto === item._key;
            return (
              <div key={item._key} className="rounded-xl border border-soft dark:border-gray-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAbierto(estaAbierto ? null : item._key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <span className="font-semibold text-sm text-base-clr text-left">
                    {tituloItem(item, index)}
                  </span>
                  <span className="text-xs text-muted-clr">{estaAbierto ? "▲" : "▼"}</span>
                </button>

                {estaAbierto && (
                  <div className="p-4 space-y-4 border-t border-soft dark:border-gray-700">
                    <div>
                      <label className="text-sm">Nombre del criterio (opcional)</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={item.etiqueta || ""}
                        onChange={(e) => actualizarItem(item._key, { etiqueta: e.target.value })}
                        placeholder="Ej: Casa para vivir"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm">Tipo de propiedad</label>
                        <select
                          className={inputClass}
                          value={item.tipo_de_propiedad || ""}
                          onChange={(e) =>
                            actualizarItem(item._key, { tipo_de_propiedad: e.target.value as TipoPropiedad | "" })
                          }
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
                          value={item.ambientes_min ?? ""}
                          onChange={(e) =>
                            actualizarItem(item._key, {
                              ambientes_min: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          placeholder="Ej: 2"
                        />
                      </div>

                      <div>
                        <label className="text-sm">Operación</label>
                        <select
                          className={inputClass}
                          value={item.operacion || ""}
                          onChange={(e) =>
                            actualizarItem(item._key, { operacion: e.target.value as "venta" | "alquiler" | "" })
                          }
                        >
                          <option value="">Venta o alquiler</option>
                          <option value="venta">Venta</option>
                          <option value="alquiler">Alquiler</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm">Localidad</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={item.localidad || ""}
                          onChange={(e) => actualizarItem(item._key, { localidad: e.target.value })}
                          placeholder="Ej: Marcos Juárez"
                        />
                      </div>

                      <div>
                        <label className="text-sm">Barrio</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={item.barrio || ""}
                          onChange={(e) => actualizarItem(item._key, { barrio: e.target.value })}
                          placeholder="Ej: Centro"
                        />
                      </div>

                      <div>
                        <label className="text-sm">Presupuesto mínimo</label>
                        <input
                          type="number"
                          min={0}
                          className={inputClass}
                          value={item.presupuesto_min ?? ""}
                          onChange={(e) =>
                            actualizarItem(item._key, {
                              presupuesto_min: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="text-sm">Presupuesto máximo</label>
                        <input
                          type="number"
                          min={0}
                          className={inputClass}
                          value={item.presupuesto_max ?? ""}
                          onChange={(e) =>
                            actualizarItem(item._key, {
                              presupuesto_max: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          placeholder="Sin límite"
                        />
                      </div>

                      <div>
                        <label className="text-sm">Moneda</label>
                        <select
                          className={inputClass}
                          value={item.moneda || "USD"}
                          onChange={(e) => actualizarItem(item._key, { moneda: e.target.value as "USD" | "ARS" })}
                        >
                          <option value="USD">USD</option>
                          <option value="ARS">ARS</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => eliminarCriterio(item._key)}
                        className="h-9 px-4 rounded-lg border text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/40 hover:bg-rose-600 hover:text-white transition-all"
                      >
                        Eliminar este criterio
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={agregarCriterio}
          className="w-full h-10 rounded-lg border border-dashed border-soft dark:border-gray-700 text-sm font-semibold text-muted-clr hover:text-base-clr hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
        >
          + Agregar criterio
        </button>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 sm:gap-2">
        {hayAlgunoExistente && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={saving}
            className="w-full sm:w-auto h-10 px-4 rounded-lg border text-sm text-gray-700 dark:text-gray-300 border-soft dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60"
          >
            Eliminar todos
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
