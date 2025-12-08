import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Contact,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
  LogOut, 
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
};

const items: Item[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/leads", label: "Leads", icon: Contact },
  { to: "/app/propiedades", label: "Propiedades", icon: Building2 },
  { to: "/app/avisos", label: "Recordatorios", icon: Bell },
  { to: "/app/configuracion", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("rc_sidebar_collapsed", false);
  const [userName, setUserName] = useState<string | null>(null);
  const navigate = useNavigate();

  const width = collapsed ? "w-[76px]" : "w-64";

  useEffect(() => {
    const stored = localStorage.getItem("rc_user_name");
    setUserName(stored);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("rc_user_id");
    localStorage.removeItem("rc_user_name");
    navigate("/");
  };

  return (
    <aside
      className={clsx(
        // CORRECCIÓN: Fondo #050505 para igualar al Dashboard y borde casi invisible
        "h-screen sticky top-0 border-r border-white/5 bg-[#050505]",
        "transition-all duration-300 ease-in-out hidden md:flex flex-col z-50",
        width
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-white/5">
        <div className="relative group">
            {/* Glow sutil detrás del logo */}
            <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src="/logo.png" alt="RC" className="relative h-8 w-8 rounded object-contain" />
        </div>
        
        {!collapsed && (
          <div className="font-semibold leading-tight animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="text-sm text-white tracking-wide">Real Connect</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">CRM Inmobiliario</div>
          </div>
        )}
        <button
          className="ml-auto inline-flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white h-7 w-7 transition-all"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/app"}
              className={({ isActive }) =>
                clsx(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                  // Estado inactivo: Gris y hover sutil
                  !isActive && "text-gray-400 hover:text-white hover:bg-white/5",
                  // Estado activo: Texto blanco, fondo con gradiente sutil y borde
                  isActive && "text-white bg-gradient-to-r from-blue-600/10 to-indigo-600/5 border border-blue-500/20"
                )
              }
            >
               {({ isActive }) => (
                <>
                  {/* Indicador lateral activo */}
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_#3b82f6]"></div>}
                  
                  <Icon className={clsx("h-5 w-5 shrink-0 transition-colors", isActive ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300")} />
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-white/5 bg-[#050505]">
        <div className="p-3">
          <button
            onClick={handleLogout}
            className={clsx(
              "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium",
              "hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-transparent hover:border-rose-500/20",
              "transition-all duration-200"
            )}
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>

          {!collapsed && userName && (
            <div className="mt-3 px-1 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">Usuario</p>
                <p className="text-xs text-gray-400 font-medium truncate">{userName}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}