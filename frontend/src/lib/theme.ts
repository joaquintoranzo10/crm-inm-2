export const THEME_LS_KEY = "rc-theme"; 

export function getInitialTheme(): "light" | "dark" {
  const rootHasDark = document.documentElement.classList.contains("dark");
  if (rootHasDark) return "dark";
  const saved = localStorage.getItem(THEME_LS_KEY);
  if (saved === "light" || saved === "dark") return saved as "light" | "dark";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function applyTheme(next: "light" | "dark") {
  const root = document.documentElement; 
  root.classList.toggle("dark", next === "dark");
  root.setAttribute("data-theme", next);
  localStorage.setItem(THEME_LS_KEY, next);
}