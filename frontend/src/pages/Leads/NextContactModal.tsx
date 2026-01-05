import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Props = {
  contacto: {
    id: number;
    nombre?: string;
    apellido?: string;
    next_contact_at?: string | null;
    next_contact_note?: string | null;
  };
  onClose: () => void;
};

export default function NextContactModal({ contacto, onClose }: Props) {
  const [fechaHora, setFechaHora] = useState("");
  const [nota, setNota] = useState(contacto.next_contact_note || "");
  const [saving, setSaving] = useState(false);

  // Precarga el valor actual si existe
  useEffect(() => {
    if (contacto.next_contact_at) {
      // El input datetime-local espera un string YYYY-MM-DDTHH:mm
      const localDate = new Date(contacto.next_contact_at);
      const formatted = format(localDate, "yyyy-MM-dd'T'HH:mm");
      setFechaHora(formatted);
      setNota(contacto.next_contact_note || "");
    } else {
      // Valor por defecto para una fecha y hora futura si no hay
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const defaultDate = format(now, "yyyy-MM-dd'T'HH:mm");
      setFechaHora(defaultDate);
      setNota("");
    }
  }, [contacto]);

  async function handleSubmit() {
    setSaving(true);
    try {
      if (!fechaHora) {
        toast.error("Selecciona una fecha y hora para el próximo contacto.");
        return;
      }

      const payload = {
        next_contact_at: new Date(fechaHora).toISOString(),
        next_contact_note: nota,
      };

      await api.patch(`/contactos/${contacto.id}/`, payload);
      toast.success("Próximo contacto actualizado.");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el próximo contacto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      const payload = {
        next_contact_at: null,
        next_contact_note: null,
      };

      await api.patch(`/contactos/${contacto.id}/`, payload);
      toast.success("Próximo contacto limpiado.");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al limpiar el próximo contacto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Configurar próximo contacto con ${contacto.nombre} ${contacto.apellido}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm">Fecha y hora</label>
          <input
            type="datetime-local"
            className="mt-1 w-full border rounded-md px-3 py-2 bg-app dark:bg-gray-950 border-soft dark:border-gray-700"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Nota (opcional)</label>
          <textarea
            className="mt-1 w-full border rounded-md px-3 py-2 bg-app dark:bg-gray-950 border-soft dark:border-gray-700"
            rows={3}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: Llamar para confirmar visita"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        {contacto.next_contact_at && (
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="h-10 px-4 rounded-lg border text-sm text-gray-700 dark:text-gray-300 border-soft dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-60"
          >
            Limpiar
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-bold border border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500 hover:text-white shadow-sm transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !fechaHora}
          className="h-10 px-6 rounded-lg text-sm font-bold transition-all border border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white shadow-sm"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}