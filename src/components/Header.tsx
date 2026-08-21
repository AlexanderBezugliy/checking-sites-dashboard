import { config } from "../config";
import { formatKyiv, relativeFromNow } from "../lib/format";
import type { StatusPayload } from "../types";
import { BrandLogo } from "./BrandLogo";
import { ShinyButton } from "./ShinyButton";

type HeaderProps = {
  payload: StatusPayload | null;
  loading: boolean;
  onRefresh: () => void;
};

export function Header({ payload, loading, onRefresh }: HeaderProps) {
  return (
    <header className="top">
      <div className="top-brand">
        <p className="kicker">{config.telegramChannel}</p>
        <h1 className="brand-title">
          <BrandLogo />
        </h1>
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
      </div>
      <ShinyButton className="btn-refresh" onClick={onRefresh} disabled={loading}>
        {loading ? "Обновляю…" : "Обновить"}
      </ShinyButton>
    </header>
  );
}
