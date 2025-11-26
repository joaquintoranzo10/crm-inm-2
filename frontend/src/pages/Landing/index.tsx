import { Link } from "react-router-dom";

export default function Landing() {
  return (
    
    <section className="py-16 md:py-24 transition-colors duration-500">
      
      
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        /* Clase reutilizable para aplicar la animación */
        .animate-enter {
          opacity: 0; /* Empieza invisible */
          animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>

      <div className="grid md:grid-cols-2 gap-10 items-center">
        {/* Izquierda */}
        <div className="space-y-6">
          
          {/* Chip  */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs
                          border rc-border
                          rc-card
                          text-gray-700 dark:text-gray-300
                          animate-enter"
               style={{ animationDelay: '0s' }}>
            Nuevo • Real Connect
          </div>

          {/* Título  */}
          <h1 className="text-3xl md:text-5xl font-bold leading-tight
                         rc-text
                         animate-enter"
              style={{ animationDelay: '0.1s' }}>
            El CRM inmobiliario que no te deja perder un lead.
          </h1>

          {/* Subtítulo  */}
          <p className="text-lg rc-muted dark:text-gray-300 animate-enter"
             style={{ animationDelay: '0.2s' }}>
            Centralizá contactos, propiedades y seguimientos en un solo lugar.
            Simple, rápido y listo para ejecutar.
          </p>

          {/* Acciones  */}
          <div className="flex flex-wrap gap-3 animate-enter"
               style={{ animationDelay: '0.3s' }}>
            {/* Primario  */}
            <Link
              to="/register"
              className="inline-flex items-center rounded-md px-4 py-2
                         bg-blue-600 rc-text hover:bg-blue-700
                         transition-all duration-300 transform hover:scale-105"
            >
              Registrarse
            </Link>

            {/* Secundario  */}
            <Link
              to="/login"
              className="inline-flex items-center rounded-md px-4 py-2
                         border rc-border
                         rc-card
                         rc-text
                         hover:bg-[rgb(var(--card))/0.4]
                         transition-all duration-300 transform hover:scale-105"
            >
              Iniciar sesión
            </Link>
          </div>

          {/* Bullets  */}
          <ul className="text-sm rc-muted dark:text-gray-300 space-y-1 animate-enter"
              style={{ animationDelay: '0.4s' }}>
            <li>• Gestión de leads con estados y seguimiento</li>
            <li>• Inventario de propiedades con imágenes</li>
            <li>• Panel con KPIs y actividad</li>
          </ul>
        </div>

        {/*  (Video/Imagen)  */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-enter"
             style={{ animationDelay: '0.5s' }}>
          <img src="/logo.png" alt="Real Connect" className="h-24 w-auto mx-auto mb-6 block" />
          <video
            src="/video.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="rounded-xl w-full h-64 object-cover"
          />
          <p className="mt-3 text-xs text-gray-500">Mockup de app (ilustrativo)</p>
        </div>
      </div>
    </section>
  );
}