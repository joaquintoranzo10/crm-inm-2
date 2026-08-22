import { CardCarousel, absMedia, badgeTipo, money } from "@/lib/propiedadCardHelpers";

type PropiedadLike = {
  id: number;
  codigo: string;
  titulo: string;
  ubicacion?: string;
  disponibilidad?: string;
  tipo_de_propiedad: any;
  precio: number | string;
  moneda: "USD" | "ARS";
  ambiente?: number;
  banos?: number;
  antiguedad?: number;
  superficie?: number | string;
  estado: "disponible" | "vendido" | "reservado" | string;
  descripcion?: string;
  imagenes?: { id: number; imagen: string; descripcion?: string | null }[];
};

type Props = {
  propiedad: PropiedadLike;
  onVer?: () => void;
  onEditar?: () => void;
  onBorrar?: () => void;
};


export default function PropiedadCard({ propiedad: p, onVer, onEditar, onBorrar }: Props) {
  const tipo = badgeTipo(p.tipo_de_propiedad as any);

  let ribbonGradient: React.CSSProperties = {};
  if (p.estado === "disponible") {
    ribbonGradient = { backgroundImage: "linear-gradient(45deg, #4ade80 0%, #22c55e 51%, #16a34a 100%)", boxShadow: "0 5px 10px rgba(0,0,0,0.2)" };
  } else if (p.estado === "vendido") {
    ribbonGradient = { backgroundImage: "linear-gradient(45deg, #ef4444 0%, #dc2626 51%, #b91c1c 100%)", boxShadow: "0 5px 10px rgba(0,0,0,0.2)" };
  }

  return (
    <article
      className="card_box flex flex-col bg-white border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.12)] dark:bg-gradient-to-br dark:from-[#3a38389f] dark:to-[#1f1f1f] dark:border-none dark:shadow-[0_25px_50px_rgba(0,0,0,0.55)] dark:hover:shadow-[0_15px_30px_rgba(0,0,0,0.7)]"
      onClick={onVer}
    >
      {/* CINTA DE ESTADO */}
      <div className="ribbon-wrapper">
        <div className="ribbon-content" style={ribbonGradient}>
          {p.estado === "disponible" ? "Disponible" : p.estado}
        </div>
      </div>

      {/* Imagen superior */}
      <div className="relative">
        <CardCarousel images={(p.imagenes || []).map((x) => absMedia(x.imagen))} />
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
            { k: "Sup", v: `${p.superficie ?? "-"} m²` },
            { k: "Cod", v: p.codigo },
          ].map((it) => (
            <div key={it.k} className="bg-gray-50 dark:bg-white/5 rounded-lg px-1 py-1 sm:py-1.5 text-center border border-gray-100 dark:border-white/5">
              <div className="text-[8px] sm:text-[9px] text-gray-500 uppercase">{it.k}</div>
              <div className="text-[11px] sm:text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{it.v}</div>
            </div>
          ))}
        </div>

        {(onVer || onEditar || onBorrar) && (
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            {onVer && (
              <button
                className="flex-1 cursor-pointer transition-all bg-gray-600 text-white px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border-gray-700 border-b-[3px] sm:border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-[10px] sm:text-[11px] font-bold text-center"
                onClick={(e) => { e.stopPropagation(); onVer(); }}
              >
                VER
              </button>
            )}
            {onEditar && (
              <button
                className="flex-1 cursor-pointer transition-all bg-blue-500 text-white px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border-blue-700 border-b-[3px] sm:border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-[10px] sm:text-[11px] font-bold text-center"
                onClick={(e) => { e.stopPropagation(); onEditar(); }}
              >
                EDITAR
              </button>
            )}
            {onBorrar && (
              <button
                className="flex-1 cursor-pointer transition-all bg-rose-500 text-white px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border-rose-700 border-b-[3px] sm:border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] text-[10px] sm:text-[11px] font-bold text-center"
                onClick={(e) => { e.stopPropagation(); onBorrar(); }}
              >
                BORRAR
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
