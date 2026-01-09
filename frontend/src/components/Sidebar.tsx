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
    <aside
      className={clsx(
        "h-screen sticky top-0 border-r transition-all duration-300 ease-in-out hidden md:flex flex-col z-50 relative",
        width,
        
        "bg-white dark:bg-transparent dark:backdrop-blur-xl",
        "border-gray-200 dark:border-white/5",
        
        "rc-sidebar-force"
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          "flex items-center py-6 border-b border-gray-200 dark:border-white/5 transition-all",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        <div
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
          onClick={() => navigate("/app")}
        >
          <div className="relative group shrink-0">
            <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src="/logo.png" alt="RC" className="relative h-10 w-10 rounded object-contain" />
          </div>

          <div
            className={clsx(
              "font-semibold leading-tight duration-300 whitespace-nowrap transition-all",
              collapsed ? "w-0 opacity-0 translate-x-10 hidden" : "w-auto opacity-100 translate-x-0 block"
            )}
          >
            {/* Títulos */}
            <div className="text-sm tracking-wide rc-sidebar-force">Real Connect</div>
            <div className="text-[10px] uppercase tracking-wider opacity-80 rc-sidebar-force">
              CRM Inmobiliario
            </div>
          </div>
        </div>

        {/* BOTÓN DE COLAPSAR  */}
        <button
          className={clsx(
            "absolute -right-3.5 top-9 z-50",
            "flex items-center justify-center rounded-full h-7 w-7 border shadow-md transition-all",
            "bg-white border-gray-200 hover:bg-gray-100",
            "dark:border-white/10 dark:hover:bg-white/10 dark:bg-[#18181b]",
           
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
              className={({ isActive }) =>
                clsx(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                  
                  isActive
                    ? "bg-blue-100 shadow-sm dark:bg-blue-600/20 dark:border dark:border-blue-500/30"
                    : "hover:bg-blue-50 dark:hover:bg-blue-900/20",
                  
                
                  "rc-sidebar-force",
                  
                  isActive && "rc-active"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-600 rounded-r-full shadow-sm"></div>
                  )}
               
                  <Icon className="h-5 w-5 shrink-0 transition-colors" />
                  
                  {!collapsed && (
                    <span className="truncate">{it.label}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>


      {/* Footer */}
      <div
        className={clsx(
          "mt-auto border-t transition-colors",
          "bg-white dark:bg-transparent",
          "border-gray-200 dark:border-white/5"
        )}
      >
        <div className="p-3">
          <button
            onClick={handleLogout}
            className={clsx(
              "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border border-transparent transition-all duration-200",
              "hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200",
              "dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/20",
              
              "rc-sidebar-force"
            )}
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">Cerrar sesión</span>}
          </button>

          {!collapsed && userName && (
            <div className="mt-3 px-1 text-center">
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
  );
}