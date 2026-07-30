import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    
    <div className="min-h-screen flex flex-col font-plus-jakarta bg-white text-slate-900 dark:bg-[#050505] dark:text-gray-100 transition-colors duration-300 relative overflow-x-hidden selection:bg-blue-500/20">
      

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
        
        /* Ajustes tipográficos para Tailwind */
        .font-plus-jakarta {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
      `}</style>

      <div className="fixed inset-0 -z-10 bg-white dark:bg-[#050505] transition-colors duration-300">
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" 
             style={{ 
                 backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', 
                 backgroundSize: '40px 40px',
                 color: 'inherit' 
             }}>
        </div>
      </div>

      
      <header className="fixed top-0 left-0 right-0 z-50 mx-auto max-w-7xl px-4 my-4">
       
        <div className="w-full h-18 rounded-3xl border border-gray-100/30 bg-white/40 dark:bg-[#050505]/30 dark:border-white/[0.03] backdrop-blur-3xl flex items-center justify-between px-3 sm:px-6 shadow-[0_12px_40px_-5px_rgb(0,0,0,0.08)] dark:shadow-[0_12px_40px_-5px_rgb(0,0,0,0.4)]">
          
          
          <Link to="/" className="flex items-center gap-2 sm:gap-4 group shrink-0">
           
            <div className="relative flex items-center justify-center h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-white/20 dark:bg-black/20 border border-gray-100/20 dark:border-white/5 transition-transform group-hover:scale-105 shadow-[0_4px_15px_-2px_rgba(0,0,0,0.1)]">
                <img src="/logo.png" className="h-6 w-6 sm:h-7 sm:w-7 object-contain z-10" alt="Real Connect Logo" />

                <div className="absolute -inset-1 blur-xl rounded-full bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
         
            <span className="font-extrabold text-base sm:text-xl tracking-tighter text-slate-950 dark:text-white whitespace-nowrap">
              Real Connect
            </span>
          </Link>

      
          <nav className="flex items-center gap-2 sm:gap-6">
            
  
            <Link 
              to="/login"
              className="whitespace-nowrap text-xs sm:text-sm font-semibold transition-all text-slate-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-white"
            >
              Iniciar sesión
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl h-10 sm:h-11 px-3 sm:px-6 text-xs sm:text-sm font-bold transition-all transform hover:scale-105 shadow-md
                bg-slate-950 text-white hover:bg-black
                dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100"
            >
              <span className="hidden sm:inline">Crear cuenta gratis</span>
              <span className="sm:hidden">Crear cuenta</span>
            </Link>

          </nav>
        </div>
      </header>

      
      <main className="flex-1 w-full pt-28 flex flex-col">
        <Outlet />
      </main>

    </div>
  );
}