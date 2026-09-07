import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type MenuOption<T extends string> = {
  id: T;
  label: string;
  count?: number | string;
};

export type MenuGroup<T extends string> = {
  id: string;
  label?: string;
  options: MenuOption<T>[];
};

function MenuText({
  label,
  count,
}: {
  label: ReactNode;
  count?: number | string;
}) {
  if (count == null) return <>{label}</>;
  return (
    <>
      {label}
      <span className="menu-sep">-</span>
      <span className="menu-count">{count}</span>
    </>
  );
}

export function MenuSelect<T extends string>({
  label,
  value,
  valueLabel,
  valueCount,
  groups,
  onChange,
}: {
  label: string;
  value: T;
  valueLabel: string;
  valueCount?: number | string;
  groups: MenuGroup<T>[];
  onChange: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const spoken =
    valueCount == null ? `${label}: ${valueLabel}` : `${label}: ${valueLabel} ${valueCount}`;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={open ? "menu is-open" : "menu"} ref={rootRef}>
      <button
        type="button"
        className="menu-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        aria-label={spoken}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="menu-value">
          <MenuText label={valueLabel} count={valueCount} />
        </span>
        <span className="menu-caret" aria-hidden>
          <svg viewBox="0 0 14 9" width="14" height="9">
            <path
              d="M1.5 1.5 L7 7 L12.5 1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="menu-panel" id={panelId} role="menu" aria-label={label}>
          {groups.map((group) => (
            <div key={group.id} className="menu-group" role="group" aria-label={group.label}>
              {group.label ? <p className="menu-group-label">{group.label}</p> : null}
              {group.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  className={option.id === value ? "on" : undefined}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <MenuText label={option.label} count={option.count} />
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
