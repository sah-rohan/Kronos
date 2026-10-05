import { useEffect } from "react";

export type ThemeMode = "auto" | "light" | "dark";

export const parseTheme = (t?: string): ThemeMode => (t === "light" || t === "dark" ? t : "auto");

// Auto follows the local clock: dark from 7pm to 7am.
export function effectiveDark(theme: ThemeMode, d = new Date()): boolean {
  if (theme !== "auto") return theme === "dark";
  const h = d.getHours();
  return h >= 19 || h < 7;
}

function applyTheme(theme: ThemeMode) {
  const dark = effectiveDark(theme);
  document.documentElement.classList.toggle("dark", dark);
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = dark ? "#141310" : "#f6f4ee";
  document.head.appendChild(meta);
}

// Applies the theme and status-bar colour. In auto mode it re-checks every
// minute and whenever the tab regains focus, so it flips at the day/night
// boundary without a reload.
export function useApplyTheme(theme: ThemeMode) {
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "auto") return;
    const apply = () => applyTheme(theme);
    const id = setInterval(apply, 60000);
    document.addEventListener("visibilitychange", apply);
    window.addEventListener("focus", apply);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", apply);
      window.removeEventListener("focus", apply);
    };
  }, [theme]);
}
