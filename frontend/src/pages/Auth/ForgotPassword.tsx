import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/password-reset/request/", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Ocurrió un error. Intentá nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 transition-colors duration-300">
        <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl p-8 text-center transition-colors">
          
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">¡Revisá tu correo!</h2>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Si el email <strong className="text-[var(--text-main)]">{email}</strong> está registrado, recibirás un enlace para
            restablecer tu contraseña en los próximos minutos.
          </p>
          <p className="text-xs text-[var(--muted)] opacity-70 mb-6">
            El enlace tiene una validez de 30 minutos. Revisá también la carpeta de spam.
          </p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm"
          >
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 transition-colors duration-300">
      
      <div className="fixed inset-0 -z-10 bg-[var(--bg-body)]">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
              style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
        </div>
      </div>

      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-8 relative z-10 transition-colors">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">¿Olvidaste tu contraseña?</h2>
          <p className="text-[var(--muted)] mt-2 text-sm">
            Ingresá tu email y te enviamos un enlace para restablecerla.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider ml-1 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-[var(--muted)]"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-200 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm"
          >
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-6 pt-6 border-t border-[var(--border)]">
          ¿Recordaste tu contraseña?{" "}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}