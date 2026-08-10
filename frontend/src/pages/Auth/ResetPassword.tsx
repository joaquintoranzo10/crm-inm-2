import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../../lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [reNewPassword, setReNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 transition-colors duration-300">
        <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl p-8 text-center transition-colors">
          
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Enlace inválido</h2>
          <p className="text-[var(--muted)] mb-6 text-sm">
            El enlace de restablecimiento es inválido o ya expiró. Solicitá uno nuevo.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== reNewPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm/", {
        token,
        new_password: newPassword,
        re_new_password: reNewPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "No se pudo restablecer la contraseña. El enlace puede haber expirado."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] px-4 transition-colors duration-300">
        <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl p-8 text-center transition-colors">
          
          <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">¡Contraseña actualizada!</h2>
          <p className="text-[var(--text-main)] mb-2 text-sm font-medium">Tu contraseña fue restablecida correctamente.</p>
          <p className="text-xs text-[var(--muted)] opacity-70 mb-6">Redirigiendo al login en 3 segundos...</p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm"
          >
            Ir al login ahora
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
          
          <h2 className="text-2xl font-bold text-[var(--text-main)]">Nueva contraseña</h2>
          <p className="text-[var(--muted)] mt-2 text-sm">Ingresá tu nueva contraseña para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="new_password" className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider ml-1 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="new_password"
                type={showPwd ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-2.5 pr-12 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-[var(--muted)]"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 text-sm font-medium transition-colors"
              >
                {showPwd ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="re_new_password" className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider ml-1 mb-1.5">
              Repetir contraseña
            </label>
            <input
              id="re_new_password"
              type={showPwd ? "text" : "password"}
              required
              value={reNewPassword}
              onChange={(e) => setReNewPassword(e.target.value)}
              placeholder="Repetí la contraseña"
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
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-6 pt-6 border-t border-[var(--border)]">
          ¿Necesitás un nuevo enlace?{" "}
          <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium">
            Solicitarlo aquí
          </Link>
        </p>
      </div>
    </div>
  );
}