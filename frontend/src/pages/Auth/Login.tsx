// Importamos hooks de React y utilidades de React Router
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// Importamos axios para realizar llamadas HTTP
import axios from "axios";

// Importamos nuestro cliente configurado y la URL base del backend
import { api, API_BASE } from "@/lib/api";

type JwtResponse = { access: string; refresh?: string };

export default function Login() {
  const navigate = useNavigate();

  const [userOrEmail, setUserOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

 
  useEffect(() => {
    localStorage.removeItem("rc_token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("rc_user_id");
  }, []);

 
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = API_BASE + "auth/token/";
      const res = await axios.post<JwtResponse>(
        url,
        { username: userOrEmail.trim(), password },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const { access, refresh } = res.data;
      if (!access) throw new Error("No llegó el access token");

      localStorage.setItem("rc_token", access);
      if (refresh) localStorage.setItem("refresh", refresh);
      if (!localStorage.getItem("rc_theme")) localStorage.setItem("rc_theme", "dark");

      const me = await api.get<{ id: number }>("usuarios/me/");
      localStorage.setItem("rc_user_id", String(me.data.id));

      navigate("/app", { replace: true });

    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error("LOGIN ERROR", status, data ?? err);

      let msg = "Correo o contraseña incorrectos.";
      const detail = data?.detail || data?.message || (typeof data === "string" ? data : "");

      if (/No active account found with the given credentials\.?/.test(detail || "")) {
        msg = "Correo o contraseña incorrectos.";
      } else if (detail) {
        msg = detail;
      } else if (status && status !== 401) {
        msg = `Error ${status}: no se pudo iniciar sesión.`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="relative w-full min-h-screen text-[var(--text-main)] bg-[var(--bg-body)] font-sans overflow-hidden flex items-center justify-center p-4 transition-colors duration-300">
      
      <style>{`
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>

      
      <div className="fixed inset-0 -z-10 bg-[var(--bg-body)]">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
              style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
        </div>
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        
        
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20"></div>
        
        <div className="relative bg-[var(--surface)]/90 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-8 shadow-2xl transition-colors">
          
         
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-black tracking-tighter text-[var(--text-main)] mb-2">
              Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400">Real Connect</span>
            </h1>
            <p className="text-sm text-[var(--muted)]">Ingresá tus credenciales para acceder al CRM.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-200 text-sm p-3 rounded-lg flex items-start gap-2 animate-pulse">
                <svg className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            {/* Input: Usuario/Email */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider ml-1">Email o Usuario</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  required
                  value={userOrEmail}
                  onChange={(e) => setUserOrEmail(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-main)] rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-[var(--muted)]"
                  placeholder="ej. usuario@empresa.com"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Input: Contraseña */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-main)] rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-[var(--muted)]"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

           
            <button
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl p-[1px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[var(--bg-body)] mt-2"
            >
             
               <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               
             
               <span className="relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-bold text-white transition-all group-hover:bg-slate-800 dark:group-hover:bg-slate-900 group-hover:from-transparent group-hover:to-transparent group-disabled:opacity-70 group-disabled:cursor-not-allowed">
                  {loading ? (
                    <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Ingresando...</span>
                    </div>
                  ) : (
                    "Iniciar Sesión"
                  )}
               </span>
            </button>
           
          </form>

          {/* Footer del card */}
          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center space-y-3">
            <p className="text-xs text-[var(--muted)]">
              <Link
                to="/forgot-password"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
            <p className="text-xs text-[var(--muted)]">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}