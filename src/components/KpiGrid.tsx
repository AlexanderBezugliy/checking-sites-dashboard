import type { ReactNode } from "react";
import { Activity, Search, ServerCrash, ShieldAlert } from "lucide-react";
import { formatKyiv, relativeFromNow } from "../lib/format";
import {
  collectNotIndexedPages,
  notIndexedCsv,
  notIndexedFileName,
} from "../lib/export";
import { httpMixParts } from "../lib/metrics";
import type { Metrics, SiteRow, StatusPayload, TableFilter } from "../types";
import { ShinyButton } from "./ShinyButton";

export function KpiGrid({
  metrics,
  payload,
  rows,
  filter,
  onFilter,
}: {
  metrics: Metrics;
  payload: StatusPayload;
  rows: SiteRow[];
  filter: TableFilter;
  onFilter: (filter: TableFilter) => void;
}) {
  const mix = httpMixParts(metrics);
  const serverDown = metrics.failed > 0;
  const pct = (n: number) => Math.round((n / mix.total) * 100);
  const notIndexed = collectNotIndexedPages(rows);

  function downloadNotIndexed() {
    if (!notIndexed.length) return;
    const blob = new Blob([notIndexedCsv(notIndexed)], {
      type: "text/csv;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = notIndexedFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="summary reveal">
      <div className="kpi-grid">
        <KpiCard
          icon={<Activity size={18} />}
          label="Сайты"
          value={String(metrics.alive)}
          hint={`/ ${metrics.total}`}
          tone="ok"
          active={filter === "all"}
          alert={false}
          onClick={() => onFilter("all")}
        />
        <KpiCard
          icon={<ServerCrash size={18} />}
          label="Ответ сервера"
          value={String(metrics.failed)}
          tone="down"
          active={filter === "down"}
          alert={serverDown}
          onClick={() => onFilter("down")}
        />
        <KpiCard
          icon={<Search size={18} />}
          label="Индексация"
          value={String(metrics.indexIssues)}
          tone="warn"
          active={filter === "indexissue"}
          alert={metrics.indexIssues > 0}
          onClick={() => onFilter("indexissue")}
        />
        <KpiCard
          icon={<ShieldAlert size={18} />}
          label="SSL"
          value={String(metrics.sslLive)}
          tone="warn"
          active={filter === "ssl"}
          alert={metrics.sslLive > 0}
          onClick={() => onFilter("ssl")}
        />
      </div>

      <div className="dash-lower">
      <article className="summary-mix">
        <div className="mix-rows">
          <MixRow
            label="HTTP 200"
            count={metrics.http200}
            percent={pct(metrics.http200)}
            share={mix.okShare}
            tone="ok"
            active={filter === "200"}
            onClick={() => onFilter("200")}
          />
          <MixRow
            label="Редирект 302"
            count={metrics.http302}
            percent={pct(metrics.http302)}
            share={mix.redirectShare}
            tone="redirect"
            active={filter === "302"}
            onClick={() => onFilter("302")}
          />
          <MixRow
            label="Клоака 503"
            count={metrics.cloak503}
            percent={pct(metrics.cloak503)}
            share={mix.cloakShare}
            tone="cloak"
            active={filter === "503"}
            onClick={() => onFilter("503")}
          />
          {mix.other > 0 ? (
            <MixRow
              label="Ошибка"
              count={mix.other}
              percent={pct(mix.other)}
              share={mix.otherShare}
              tone="down"
              active={filter === "down"}
              onClick={() => onFilter("down")}
            />
          ) : null}
        </div>
      </article>
      <aside className="summary-side">
        <div className="summary-meta">
          <div>
            <span className="label">Последняя проверка</span>
            <strong>
              {formatKyiv(payload.last_update)}
              <em> · {relativeFromNow(payload.last_update)}</em>
            </strong>
          </div>
          {payload.index_last_update ? (
            <div>
              <span className="label">Индекс обновлён</span>
              <strong>
                {formatKyiv(payload.index_last_update)}
                <em> · {relativeFromNow(payload.index_last_update)}</em>
              </strong>
            </div>
          ) : null}
        </div>
        <ShinyButton
          className="btn-export-index"
          onClick={downloadNotIndexed}
          disabled={!notIndexed.length}
        >
          {notIndexed.length
            ? `Скачать не в индексе · ${notIndexed.length}`
            : "Скачать не в индексе"}
        </ShinyButton>
      </aside>
      </div>
    </section>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
  active,
  alert,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "ok" | "down" | "warn";
  active: boolean;
  alert: boolean;
  onClick: () => void;
}) {
  const classes = ["kpi-card", `is-${tone}`];
  if (active) classes.push("is-active");
  if (alert) classes.push("is-alert");
  return (
    <button type="button" className={classes.join(" ")} onClick={onClick}>
      <span className="kpi-icon">{icon}</span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">
        {value}
        {hint ? <small>{hint}</small> : null}
      </span>
    </button>
  );
}

function MixRow({
  label,
  count,
  percent,
  share,
  tone,
  active,
  onClick,
}: {
  label: string;
  count: number;
  percent: number;
  share: number;
  tone: "ok" | "redirect" | "cloak" | "down";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? `mix-row is-${tone} is-active` : `mix-row is-${tone}`}
      onClick={onClick}
    >
      <span className="mix-label">{label}</span>
      <b className="mix-count">{count}</b>
      <em className="mix-pct">{percent}%</em>
      <span className="mix-track">
        <span className="mix-fill" style={{ width: `${Math.max(0, share) * 100}%` }} />
      </span>
    </button>
  );
}

