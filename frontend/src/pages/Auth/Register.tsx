import { FormEvent, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { onlyDigits } from "@/utils/onlyDigits";

export default function Register() {
  const navigate = useNavigate();
  // Estados
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evitar “heredar” datos viejos
  useEffect(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("rc_user_id");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Registrar usuario
      await api.post("auth/register/", {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        password,
        telefono: telefono.trim() || undefined,
        dni: dni.trim() || undefined,
      });

      //  Login inmediato
      const { data } = await api.post<{ access: string; refresh?: string }>(
        "auth/token/",
        { username: email.trim(), password }
      );
      localStorage.setItem("rc_token", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);
      if (!localStorage.getItem("rc_theme")) localStorage.setItem("rc_theme", "dark");

      // Obtener mi usuario
      const me = await api.get<{ id: number }>("usuarios/me/");
      localStorage.setItem("rc_user_id", String(me.data.id));

      navigate("/app", { replace: true });
    } catch (err: any) {
      const data = err?.response?.data;
      console.error("REGISTER ERROR:", data || err);

      let msg = "Error al registrar";
      if (data) {
        if (typeof data === "string") msg = data;
        else if (data.detail) msg = data.detail;
        else msg = Object.values(data).flat().join(" · ");
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    // Contenedor principal con scroll vertical permitido (py-10) por si el formulario es alto en móviles
    <div className="relative w-full min-h-screen text-white font-sans flex items-center justify-center py-10 px-4">
      
    
      <style>{`
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>

   
      <div className="fixed inset-0 -z-10 bg-[#050505]">
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
        </div>
      </div>

      {/* --- TARJETA GLASSMORPHISM --- */}
      <div className="w-full max-w-[500px] relative z-10">
        
        {/* Glow trasero */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20"></div>

        <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
              Crear <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Cuenta</span>
            </h1>
            <p className="text-sm text-gray-400">Unite a Real Connect y dominá tu mercado.</p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-200 text-sm p-3 rounded-lg flex items-start gap-2 animate-pulse">
               <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            
            {/* Fila: Nombre y Apellido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Nombre</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <input
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-9 pr-3 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600 text-sm"
                            placeholder="Tu nombre"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Apellido</label>
                    <div className="relative group">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <input
                            value={apellido}
                            onChange={(e) => setApellido(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-9 pr-3 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600 text-sm"
                            placeholder="Tu apellido"
                        />
                    </div>
                </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Teléfono y DNI (Opcionales) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Teléfono <span className="text-gray-600 text-[10px] lowercase">(opcional)</span></label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <input
                            value={telefono}
                            onChange={(e) => setTelefono(onlyDigits(e.target.value))}
                            onPaste={(e) => {
                                e.preventDefault();
                                const text = (e.clipboardData || (window as any).clipboardData).getData("text");
                                setTelefono(onlyDigits(text));
                            }}
                            inputMode="numeric"
                            pattern="\d*"
                            maxLength={15}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-9 pr-3 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600 text-sm"
                            placeholder="3472..."
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">DNI <span className="text-gray-600 text-[10px] lowercase">(opcional)</span></label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                             <svg className="h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                        </div>
                        <input
                            value={dni}
                            onChange={(e) => setDni(onlyDigits(e.target.value))}
                            onPaste={(e) => {
                                e.preventDefault();
                                const text = (e.clipboardData || (window as any).clipboardData).getData("text");
                                setDni(onlyDigits(text));
                            }}
                            inputMode="numeric"
                            pattern="^\d{7,8}$"
                            maxLength={8}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-9 pr-3 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600 text-sm"
                            placeholder="4097..."
                        />
                    </div>
                </div>
            </div>

            {/* Botón de Submit Animado */}
            <button
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl p-[1px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 mt-4"
            >
               <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <span className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white transition-all group-hover:bg-slate-900 group-hover:from-transparent group-hover:to-transparent group-disabled:opacity-70 group-disabled:cursor-not-allowed">
                  {loading ? (
                    <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Creando cuenta...</span>
                    </div>
                  ) : (
                    "Registrarme"
                  )}
               </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                Iniciá sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}