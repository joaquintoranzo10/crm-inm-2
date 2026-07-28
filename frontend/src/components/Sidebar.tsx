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
  Menu,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const width = collapsed ? "w-64 md:w-[76px]" : "w-64";

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || localStorage.getItem("vite-ui-theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = savedTheme === "dark" || (!savedTheme && systemDark);

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    const storedName = localStorage.getItem("rc_user_name");
    if(storedName) setUserName(storedName);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("rc_token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("rc_user_id");
    localStorage.removeItem("rc_user_name");
    navigate("/");
  };

  return (
    <>
      {/* BOTÓN FLOTANTE PARA CELULARES */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed top-4 left-4 z-[90] p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white shadow-sm flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 active:scale-95 transition-all"
          title="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* OVERLAY OSCURO PARA CELULARES */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}
    <aside
        className={clsx(
          "h-screen top-0 border-r transition-transform duration-300 ease-in-out flex flex-col z-[100]",
          "fixed md:sticky",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          width,
          "bg-surface md:dark:backdrop-blur-xl",
          "rc-border shadow-2xl md:shadow-none",
          "rc-sidebar-force",
          "rounded-r-2xl md:rounded-none"
        )}
      >
      {/* Header */}
      <div
        className={clsx(
          "flex items-center py-6 border-b rc-border transition-all",
          collapsed ? "justify-between px-4 md:justify-center md:px-0" : "justify-between px-4"
        )}
      >
        <div
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
          onClick={() => {
            navigate("/app");
            setMobileOpen(false); 
          }}
        >
          <div className="relative group shrink-0">
            <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src="/logo.png" alt="RC" className="relative h-10 w-10 rounded object-contain" />
          </div>

          <div
            className={clsx(
              "font-semibold leading-tight duration-300 whitespace-nowrap transition-all",
              collapsed ? "w-auto opacity-100 translate-x-0 block md:w-0 md:opacity-0 md:translate-x-10 md:hidden" : "w-auto opacity-100 translate-x-0 block"
            )}
          >
            {/* Títulos */}
            <div className="text-sm tracking-wide rc-sidebar-force text-gray-900 dark:text-white truncate">Real Connect</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 rc-sidebar-force truncate">
                CRM Inmobiliario
              </div>
            </div>
          </div>
          {/* BOTÓN DE CERRAR PARA CELULARES */}
          <button 
            type="button"
            className="md:hidden p-2 bg-gray-100 dark:bg-zinc-800/80 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white shrink-0 ml-2 transition-colors"
            onClick={(e) => {
               e.stopPropagation();
               setMobileOpen(false);
            }}
          >
            <X className="h-5 w-5" />
          </button>

        {/* BOTÓN DE COLAPSAR  */}
        <button
            className={clsx(
              "hidden md:flex absolute -right-3.5 top-9 z-50 items-center justify-center rounded-full h-7 w-7 border shadow-md transition-all",
              "bg-surface rc-border hover:brightness-95",
              "rc-sidebar-force"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
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
              onClick={() => setMobileOpen(false)} 
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                  isActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5" 
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" /> 
              {/* clsx para que el texto desaparezca cuando la barra colapsa */}
              <span className={clsx("truncate", collapsed ? "hidden md:hidden" : "block")}>
                {it.label}
              </span>
            </NavLink>
          );
        })}
      </nav>


      {/* Footer */}
      <div
        className={clsx(
          "mt-auto border-t transition-colors",
          "bg-transparent rc-border"
          )}
        >
        <div className="p-3">
          <button
            onClick={handleLogout}
            className={clsx(
              "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border border-transparent transition-all duration-200",
              "text-gray-600 dark:text-gray-300",
              "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200",
              "dark:hover:bg-white/10 dark:hover:text-rose-400 dark:hover:border-transparent"
            )}
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={clsx("truncate", collapsed ? "block md:hidden" : "block")}>
             Cerrar sesión
            </span>
          </button>

          {userName && (
            <div className={clsx("mt-3 px-1 text-center", collapsed ? "block md:hidden" : "block")}>
              <p className="text-[10px] uppercase tracking-widest opacity-60 rc-sidebar-force">
                Usuario
              </p>
              <p className="text-xs font-medium truncate rc-sidebar-force">
                {userName}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}