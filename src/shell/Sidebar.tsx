import { ChevronsRight, Radio } from "lucide-react";
import type { Metrics, TableFilter } from "../types";
import { SHELL_NAV } from "./nav";

export function Sidebar({
  open,
  filter,
  metrics,
  onFilter,
  onToggle,
}: {
  open: boolean;
  filter: TableFilter;
  metrics: Metrics | null;
  onFilter: (filter: TableFilter) => void;
  onToggle: () => void;
}) {
  return (
    <nav className={open ? "redesign-side is-open" : "redesign-side is-closed"} aria-label="Фильтры флота">
      <div className="side-brand">
        <span className="side-logo" aria-hidden>
          <Radio size={18} />
        </span>
        {open ? (
          <span className="side-brand-text">Checking sites</span>
        ) : null}
      </div>

      <div className="side-nav">
        {SHELL_NAV.map((item) => {
          const Icon = item.icon;
          const count = metrics ? item.count(metrics) : null;
          const alert = metrics ? item.alert(metrics) : false;
          const selected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={selected ? "side-link is-on" : "side-link"}
              aria-current={selected ? "true" : undefined}
              title={open ? undefined : item.label}
              onClick={() => onFilter(item.id)}
            >
              <span className="side-link-icon">
                <Icon size={16} />
              </span>
              {open ? <span className="side-link-label">{item.label}</span> : null}
              {open && count !== null ? (
                <span className={alert ? "side-count is-alert" : "side-count"}>{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <button type="button" className="side-hide" onClick={onToggle}>
        <span className="side-link-icon">
          <ChevronsRight size={16} className={open ? "side-chevron is-open" : "side-chevron"} />
        </span>
        {open ? <span>Скрыть</span> : null}
      </button>
    </nav>
  );
}
