import { useEffect, useState } from "react";

const STORAGE_KEY = "redesign-theme";

export type DashboardTheme = "dark" | "light";

function storedTheme(): DashboardTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Тема оболочки redesign. По умолчанию тёмная. Класс на <html>, чтобы фон страницы совпал до отрисовки. */
export function bootTheme() {
  applyTheme(storedTheme());
}

export function applyTheme(theme: DashboardTheme) {
  const root = document.documentElement;
  root.classList.add("redesign");
  root.classList.toggle("is-light", theme === "light");
  root.style.colorScheme = theme;
}

export function useDashboardTheme() {
  const [theme, setTheme] = useState<DashboardTheme>(storedTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* приватный режим */
    }
  }, [theme]);

  return {
    theme,
    toggleTheme() {
      setTheme((current) => (current === "dark" ? "light" : "dark"));
    },
  };
}
