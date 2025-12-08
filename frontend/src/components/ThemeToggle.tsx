import { useEffect, useState } from "react";
import styled from 'styled-components';
// Ya no necesitamos FiMoon ni FiSun para el estilo de switch
// import { FiMoon, FiSun } from "react-icons/fi"; 

const LS_KEY = "rc-theme"; // 'light' | 'dark'

function getInitialTheme(): "light" | "dark" {
  const rootHasDark = document.documentElement.classList.contains("dark");
  if (rootHasDark) return "dark";
  const saved = localStorage.getItem(LS_KEY);
  if (saved === "light" || saved === "dark") return saved as "light" | "dark";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(next: "light" | "dark") {
  const root = document.documentElement; // <html>
  root.classList.toggle("dark", next === "dark");
  root.setAttribute("data-theme", next); // por si querés leerlo en CSS
  localStorage.setItem(LS_KEY, next);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sincronizar entre pestañas + con el sistema operativo
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSystem = (e: MediaQueryListEvent) => {
      // Solo seguir al sistema si el usuario no guardó preferencia manual (no hay LS)
      if (!localStorage.getItem(LS_KEY)) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq?.addEventListener?.("change", onSystem);

    return () => {
      window.removeEventListener("storage", onStorage);
      mq?.removeEventListener?.("change", onSystem);
    };
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const isChecked = theme === "dark";

  return (
    // Se utiliza el componente estilizado StyledWrapper para envolver el switch
    <StyledWrapper>
      <label className="switch">
        <input 
          type="checkbox" 
          checked={isChecked} // Controla el estado: true si es tema 'dark'
          onChange={toggle} // Maneja el cambio de estado
          aria-label="Cambiar tema"
          title={isChecked ? "Cambiar a claro" : "Cambiar a oscuro"}
        />
        <span className="slider" />
      </label>
    </StyledWrapper>
  );
}

// ESTILOS DEL SWITCH USANDO styled-components
const StyledWrapper = styled.div`
  /* The switch - the box around the slider */
  .switch {
    font-size: 17px;
    position: relative;
    display: inline-block;
    width: 3.5em;
    height: 2em;
  }

  /* Hide default HTML checkbox */
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  /* The slider */
  .slider {
    --background: #28096b;
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--background);
    transition: .5s;
    border-radius: 30px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 1.4em;
    width: 1.4em;
    border-radius: 50%;
    left: 10%;
    bottom: 15%;
    box-shadow: inset 8px -4px 0px 0px #fff000;
    background: var(--background);
    transition: .5s;
  }

  input:checked + .slider {
    background-color: #522ba7;
  }

  input:checked + .slider:before {
    transform: translateX(100%);
    box-shadow: inset 15px -4px 0px 15px #fff000;
  }
`;