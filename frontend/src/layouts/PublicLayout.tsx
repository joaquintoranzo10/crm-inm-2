import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    //  Fondo base adaptable 
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-gray-50 text-slate-900 dark:bg-[#050505] dark:text-gray-100">
      
      {/*  Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-md transition-colors bg-white/80 border-gray-200 dark:bg-black/80 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          
          {/* Logo y Nombre */}
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo.png" className="h-8 w-8 object-contain transition-transform group-hover:scale-110" alt="Real Connect" />
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Real Connect
            </span>
          </Link>

          {/* Navegación Derecha */}
          <nav className="flex items-center gap-6">
            
            {/* Botón LOGIN */}
            <Link 
              to="/login"
              className="text-sm font-medium transition-colors text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
            >
              Iniciar sesión
            </Link>

            {/* Botón REGISTRO */}
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-bold transition-all transform hover:scale-105 shadow-sm
                bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/25
                dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Registrarse
            </Link>

          </nav>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}