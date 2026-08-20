import { config } from "../config";
import { formatKyiv, relativeFromNow } from "../lib/format";
import type { DataSource, StatusPayload } from "../types";

type HeaderProps = {
  payload: StatusPayload | null;
  source: DataSource | null;
  loading: boolean;
  onRefresh: () => void;
};

function sourceLabel(source: DataSource | null): string {
  if (source === "github") return "GitHub · status.json";
  if (source === "snapshot") return "локальный снимок";
  return "…";
}

export function Header({ payload, source, loading, onRefresh }: HeaderProps) {
  return (
    <header className="top">
      <div className="top-brand">
        <p className="kicker">{config.telegramChannel}</p>
        <h1>Checking-sites</h1>
      </div>
      <div className="top-meta">
        <div>
          <span className="label">Последняя проверка</span>
          <strong>
            {payload ? formatKyiv(payload.last_update) : "—"}
            {payload ? (
              <em> · {relativeFromNow(payload.last_update)}</em>
            ) : null}
          </strong>
        </div>
        <div>
          <span className="label">Источник</span>
          <strong className={source === "github" ? "live" : undefined}>
            {sourceLabel(source)}
          </strong>
        </div>
      </div>
      <button
        type="button"
        className="btn-refresh"
        onClick={onRefresh}
        disabled={loading}
      >
        {loading ? "Обновляю…" : "Обновить"}
      </button>
    </header>
  );
}
