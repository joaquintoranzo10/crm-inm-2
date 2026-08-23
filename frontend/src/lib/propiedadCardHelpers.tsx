import { useRef, useState } from "react";

const BACKEND_ORIGIN =
  (import.meta as any).env?.VITE_BACKEND_ORIGIN || "https://crm-real-connect.onrender.com";

export function absMedia(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BACKEND_ORIGIN}${url}`;
}

export function money(n: number | string, moneda: "USD" | "ARS") {
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

export function badgeTipo(tipo: any) {
  return {
    className:
      "inline-flex items-center rounded-md px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wide shadow-md transition-colors bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
    label: tipo,
  };
}


export function CardCarousel({ images }: { images: (string | null | undefined)[] }) {
  const valid = images.filter(Boolean) as string[];
  const [i, setI] = useState(0);
  const len = valid.length;

  if (len === 0) {
    return (
      <div className="relative aspect-[2/1] sm:aspect-[16/9] bg-gray-200 dark:bg-gray-800 rounded-t-xl flex items-center justify-center text-gray-400 text-xs">
        Sin imagen
      </div>
    );
  }

  const prev = () => setI((v) => (v - 1 + len) % len);
  const next = () => setI((v) => (v + 1) % len);
  const touch = useRef<{ x: number | null }>({ x: null });
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current.x = e.touches[0].clientX;
  };
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

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {valid.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setI(idx);
                }}
                className={`h-1.5 rounded-full transition-all shadow-sm ${
                  idx === i ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
