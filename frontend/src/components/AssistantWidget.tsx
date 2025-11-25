import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom"; // <-- IMPORTANTE: Añadir esto
import api from "@/lib/api"; // Asegúrate que la ruta sea correcta para tu proyecto

type AskResponse = {
  answer: string;
  data: {
    count: number;
    from?: string | null;
    to?: string | null;
    type?: string | null;
    items: Array<{
      id: number;
      tipo: "Reunion" | "Llamada" | "Visita";
      fecha_hora: string;
      propiedad?: number | null;
      propiedad_titulo?: string | null;
      contacto?: number | null;
      contacto_nombre?: string | null;
      notas?: string;
    }>;
  };
};

type Message =
  | { role: "user"; text: string; ts: number }
  | { role: "assistant"; text: string; ts: number; payload?: AskResponse["data"] }
  | { role: "system"; text: string; ts: number };

export default function AssistantWidget() {
  const location = useLocation(); // <-- Hook para detectar navegación
  const [visible, setVisible] = useState(false);

  // --- LÓGICA DE VISIBILIDAD CORREGIDA ---
  useEffect(() => {
    // 1. ¿Estamos dentro de la app? (rutas que empiezan con /app)
    const inApp = location.pathname.startsWith("/app");

    // 2. ¿Tenemos token?
    const token = localStorage.getItem("rc_token");
    const hasToken = !!token;

    // Solo mostrar si ambas son verdaderas
    setVisible(inApp && hasToken);
  }, [location]); // <-- Se ejecuta cada vez que cambia la ruta

  // Estados del widget
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hola, soy tu asistente hoy, ¿qué necesitas hacer?",
      ts: Date.now(),
    },
  ]);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open]);

  // Si no debe ser visible, no renderizamos nada
  if (!visible) return null;

  // --- FUNCIONES DEL CHAT ---

  async function sendQuery(q: string) {
    if (!q.trim() || working) return;
    setError(null);
    setWorking(true);

    setMessages((m) => [...m, { role: "user", text: q.trim(), ts: Date.now() }]);
    setInput("");

    try {
      const { data } = await api.post<AskResponse>("asistente/ask/", { query: q.trim() });
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.answer, ts: Date.now(), payload: data.data },
      ]);
    } catch (e: any) {
      console.error(e);
      const detail =
        e?.response?.data?.detail ||
        (typeof e?.message === "string" ? e.message : "No se pudo consultar al asistente.");
      setError(detail);
      setMessages((m) => [
        ...m,
        { role: "system", text: "Ups, hubo un error al consultar al asistente.", ts: Date.now() },
      ]);
    } finally {
      setWorking(false);
    }
  }

  function handleKeyDown(ev: React.KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      sendQuery(input);
    }
  }

  function dispatchGlobalEvent(eventName: string) {
    window.dispatchEvent(new CustomEvent(eventName, { detail: {} }));
  }

  const quickActions = [
    {
      label: "Agregar Lead",
      action: () => dispatchGlobalEvent("open-lead-create-modal"),
    },
    {
      label: "Agregar Evento",
      action: () => dispatchGlobalEvent("open-event-create-modal"),
    },
    {
      label: "Agregar Casa",
      action: () => dispatchGlobalEvent("open-propiedad-create-modal"),
    },
    {
      label: "Ver Eventos Hoy",
      action: () => sendQuery("Ver eventos de hoy"),
    },
    {
      label: "Ver Eventos Semana",
      action: () => sendQuery("Ver eventos de esta semana"),
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-[1000]"> {/* z-index alto para estar sobre todo */}
      {/* Toggle Button */}
      <button
        className="mb-2 h-10 px-4 rounded-full shadow-lg border border-soft dark:border-gray-700 bg-app dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="assistant-panel"
      >
        {open ? "Ocultar asistente" : "Abrir asistente"}
      </button>

      {/* Panel */}
      {open && (
        <div
          id="assistant-panel"
          className="w-[360px] max-w-[92vw] rounded-2xl border border-soft dark:border-gray-700 bg-app dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: 'calc(100vh - 100px)' }} // Evita que se salga de pantalla en móviles
        >
          <div className="px-4 py-3 border-b border-soft dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
            <div className="font-medium text-base-clr dark:text-gray-100">Asistente IA</div>
            <div className="text-xs text-muted-clr">beta</div>
          </div>

          {/* Mensajes */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-white dark:bg-gray-950/40 min-h-[200px]"
          >
            {messages.map((m, idx) => (
              <MessageBubble key={idx} msg={m} />
            ))}
            {working && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2 text-xs text-gray-500">
                  Escribiendo...
                </div>
              </div>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="p-3 border-t border-soft dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              Sugerencias
            </div>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  disabled={working}
                  className="text-xs px-3 py-1.5 rounded-full border border-soft dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 text-base-clr dark:text-gray-200 disabled:opacity-50 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 text-xs text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-900/30 border-t border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-soft dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 h-10 rounded-lg border border-soft dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 text-sm text-base-clr dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder='Ej: "Reuniones de hoy"'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={working}
                autoFocus
              />
              <button
                className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 transition-colors"
                onClick={() => sendQuery(input)}
                disabled={working || !input.trim()}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================== UI Bits =========================== */
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const isAssistant = msg.role === "assistant";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line shadow-sm ${isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : msg.role === "system"
              ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
              : "bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-none"
          }`}
      >
        <div>{msg.text}</div>
        {isAssistant && msg.payload && msg.payload.items?.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <EventsMiniList data={msg.payload} />
          </div>
        )}
      </div>
    </div>
  );
}

function EventsMiniList({ data }: { data: AskResponse["data"] }) {
  return (
    <div className="text-xs">
      <div className="mb-2 font-medium text-gray-500 dark:text-gray-400">
        {data.count} resultado{data.count === 1 ? "" : "s"} encontrados
      </div>
      <ul className="space-y-2">
        {data.items.slice(0, 5).map((it) => (
          <li
            key={it.id}
            className="rounded bg-gray-50 dark:bg-gray-900/50 p-2 border border-gray-100 dark:border-gray-700/50"
          >
            <div className="font-semibold text-gray-700 dark:text-gray-200 flex justify-between">
              <span>{it.tipo}</span>
              <span className="font-normal text-gray-500">{formatTime(it.fecha_hora)}</span>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mt-0.5">
              {formatDateShort(it.fecha_hora)}
            </div>
            <div className="text-gray-500 dark:text-gray-400 mt-1 truncate">
              {it.propiedad_titulo ? it.propiedad_titulo : it.contacto_nombre ? it.contacto_nombre : "—"}
            </div>
          </li>
        ))}
      </ul>
      {data.items.length > 5 && (
        <div className="mt-2 text-center text-blue-500 cursor-pointer hover:underline">
          Ver más en el calendario...
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' });
  } catch { return ""; }
}

function formatDateShort(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: 'numeric', month: 'short' });
  } catch { return iso; }
}