import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    // Fondo base adaptable con degradado suave
    // IMPORTANTE: Se agregó 'font-plus-jakarta' aquí
    <div className="min-h-screen flex flex-col font-plus-jakarta bg-white text-slate-900 dark:bg-[#050505] dark:text-gray-100 transition-colors duration-300 relative overflow-x-hidden selection:bg-blue-500/20">
      
      {/* --- ESTILOS INYECTADOS TEMPORALMENTE (Para la fuente) --- */}
      {/* TODO: Lo ideal es que agregues este link en el <head> de tu index.html y configures Tailwind */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
        
        /* Ajustes tipográficos para Tailwind */
        .font-plus-jakarta {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
      `}</style>

      {/* --- Fondo Decorativo Sutil --- */}
      <div className="fixed inset-0 -z-10 bg-white dark:bg-[#050505] transition-colors duration-300">
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" 
             style={{ 
                 backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', 
                 backgroundSize: '40px 40px',
                 color: 'inherit' 
             }}>
        </div>
      </div>

      {/* --- HEADER FLOTANTE ESTILO CRISTAL (navbar) --- */}
      <header className="fixed top-0 left-0 right-0 z-50 mx-auto max-w-7xl px-4 my-4">
        {/* Usamos backdrop-blur-3xl para que el cristal sea potente */}
        <div className="w-full h-18 rounded-3xl border border-gray-100/30 bg-white/40 dark:bg-[#050505]/30 dark:border-white/[0.03] backdrop-blur-3xl flex items-center justify-between px-6 shadow-[0_12px_40px_-5px_rgb(0,0,0,0.08)] dark:shadow-[0_12px_40px_-5px_rgb(0,0,0,0.4)]">
          
          {/* Logo y Nombre */}
          <Link to="/" className="flex items-center gap-4 group">
            {/* Contenedor del Logo: Más grande y completamente translúcido, como el asset */}
            <div className="relative flex items-center justify-center h-11 w-11 rounded-xl bg-white/20 dark:bg-black/20 border border-gray-100/20 dark:border-white/5 transition-transform group-hover:scale-105 shadow-[0_4px_15px_-2px_rgba(0,0,0,0.1)]">
                <img src="/logo.png" className="h-7 w-7 object-contain z-10" alt="Real Connect Logo" />
                {/* Glow sutil */}
                <div className="absolute -inset-1 blur-xl rounded-full bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            {/* Texto de Marca: Fuente cambiada y weight ajustado a font-extrabold */}
            <span className="font-extrabold text-xl tracking-tighter text-slate-950 dark:text-white">
              Real Connect
            </span>
          </Link>

          {/* Navegación Derecha */}
          <nav className="flex items-center gap-6">
            
            {/* Botón INICIAR SESIÓN: font-semibold para limpieza */}
            <Link 
              to="/login"
              className="text-sm font-semibold transition-all text-slate-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-white"
            >
              Iniciar sesión
            </Link>

            {/* Botón REGISTRARSE: Más visual y tecnológico */}
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl h-11 px-6 text-sm font-bold transition-all transform hover:scale-105 shadow-md
                bg-slate-950 text-white hover:bg-black
                dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100"
            >
              Crear cuenta gratis
            </Link>

          </nav>
        </div>
      </header>

      {/* --- CONTENIDO PRINCIPAL --- */}
      {/* pt-28 compensa el header flotante. */}
      <main className="flex-1 w-full pt-28 flex flex-col">
        <Outlet />
      </main>

    </div>
  );
}