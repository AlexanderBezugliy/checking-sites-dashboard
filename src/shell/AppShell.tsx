import { useEffect, useState, type ReactNode } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import type { Metrics, TableFilter } from "../types";
import { Sidebar } from "./Sidebar";
import { useDashboardTheme } from "./theme";
import "./shell.css";

const NARROW = "(max-width: 800px)";

/**
 * Оболочка ветки redesign: боковая панель, тема и новый вид экрана.
 * В main этих файлов нет. Удаление ветки возвращает прежний дашборд.
 */
export function AppShell({
  filter,
  metrics,
  onFilter,
  children,
}: {
  filter: TableFilter;
  metrics: Metrics | null;
  onFilter: (filter: TableFilter) => void;
  children: ReactNode;
}) {
  const { theme, toggleTheme } = useDashboardTheme();
  const [open, setOpen] = useState(true);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(NARROW);
    const sync = () => {
      setNarrow(media.matches);
      setOpen(!media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function pickFilter(next: TableFilter) {
    onFilter(next);
    if (narrow) setOpen(false);
  }

  return (
    <div className="redesign-frame">
      {narrow && open ? (
        <button
          type="button"
          className="redesign-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <Sidebar
        open={open}
        filter={filter}
        metrics={metrics}
        onFilter={pickFilter}
        onToggle={() => setOpen((value) => !value)}
      />
      <div className="redesign-main">
        <header className="redesign-top">
          <div className="redesign-heading">
            {narrow ? (
              <button
                type="button"
                className="icon-btn"
                aria-label={open ? "Закрыть меню" : "Открыть меню"}
                onClick={() => setOpen((value) => !value)}
              >
                <Menu size={18} />
              </button>
            ) : null}
            <h1>Мониторинг сайтов</h1>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
