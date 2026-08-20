import { useMemo, useState } from "react";
import { formatMs, formatRowCount } from "../lib/format";
import { hostnameOf, nsReason, sslDaysLeft, sslLabel, SSL_WARN_DAYS, statusKind, statusKindLabel, statusLabel, zoneOf } from "../lib/site";
import { filterAndSortRows, nextSort } from "../lib/table";
import type { Metrics, SiteRow, SortDir, SortKey, TableFilter } from "../types";

const FILTERS: TableFilter[] = ["all", "200", "503", "down", "ns", "ssl"];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "host", label: "хост" },
  { key: "status", label: "HTTP" },
  { key: "zone", label: "зона" },
  { key: "ssl", label: "SSL" },
  { key: "duration", label: "время" },
];

function filterCaption(id: TableFilter, metrics: Metrics): string {
  if (id === "all") return `все ${metrics.total}`;
  if (id === "200") return `200 · ${metrics.http200}`;
  if (id === "503") return `503 · ${metrics.cloak503}`;
  if (id === "ns") return `NS · ${metrics.nsProblems.length}`;
  if (id === "ssl") return `SSL · ${metrics.sslErrors + metrics.sslSoon}`;
  return `падения · ${metrics.failed}`;
}

export function SiteTable({
  rows,
  metrics,
  filter,
  onFilterChange,
}: {
  rows: SiteRow[];
  metrics: Metrics;
  filter: TableFilter;
  onFilterChange: (filter: TableFilter) => void;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("duration");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const visible = useMemo(
    () => filterAndSortRows(rows, query, filter, sortKey, sortDir),
    [rows, query, filter, sortKey, sortDir],
  );

  function toggleSort(key: SortKey) {
    const next = nextSort(sortKey, sortDir, key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  }

  return (
    <section className="table-wrap reveal delay-5">
      <div className="toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по домену или NS…"
          aria-label="Поиск по домену или NS"
        />
        <div className="chips" role="tablist">
          {FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              className={filter === id ? "on" : undefined}
              aria-pressed={filter === id}
              onClick={() => onFilterChange(id)}
            >
              {filterCaption(id, metrics)}
            </button>
          ))}
        </div>
        <div className="sort-mobile">
          <span className="label">Сортировка</span>
          <div className="chips">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={sortKey === option.key ? "on" : undefined}
                aria-pressed={sortKey === option.key}
                onClick={() => toggleSort(option.key)}
              >
                {option.label}
                {sortKey === option.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </button>
            ))}
          </div>
        </div>
        <p className="count">{formatRowCount(visible.length)}</p>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>состояние</th>
              <SortTh
                label="хост"
                active={sortKey === "host"}
                dir={sortDir}
                onClick={() => toggleSort("host")}
              />
              <SortTh
                label="HTTP"
                active={sortKey === "status"}
                dir={sortDir}
                onClick={() => toggleSort("status")}
              />
              <SortTh
                label="зона"
                active={sortKey === "zone"}
                dir={sortDir}
                onClick={() => toggleSort("zone")}
              />
              <th>NS</th>
              <SortTh
                label="SSL"
                active={sortKey === "ssl"}
                dir={sortDir}
                onClick={() => toggleSort("ssl")}
              />
              <SortTh
                label="время"
                active={sortKey === "duration"}
                dir={sortDir}
                onClick={() => toggleSort("duration")}
              />
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <SiteRowView key={`${row.url}-${index}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th>
      <button
        type="button"
        className={active ? "sort on" : "sort"}
        onClick={onClick}
      >
        {label}
        {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

function sslCellClass(row: SiteRow): string {
  const days = sslDaysLeft(row);
  if (days == null) return "mono muted";
  if (days < 0) return "mono down-text";
  if (days <= SSL_WARN_DAYS) return "mono cloak-text";
  return "mono muted";
}

function SiteRowView({ row }: { row: SiteRow }) {
  const kind = statusKind(row);
  const nsFail = nsReason(row);
  return (
    <tr className={nsFail ? "ns-bad" : kind}>
      <td data-label="состояние">
        <span className={`status ${nsFail ? "down" : kind}`}>
          <i />
          {nsFail ? "NS ошибка" : statusKindLabel(kind)}
        </span>
      </td>
      <td data-label="хост" className="host-cell">
        <a href={row.url} target="_blank" rel="noreferrer">
          {hostnameOf(row.url)}
        </a>
      </td>
      <td data-label="HTTP" className="mono">
        {statusLabel(row)}
      </td>
      <td data-label="зона" className="mono">
        {zoneOf(row.url)}
      </td>
      <td data-label="NS" className={nsFail ? "mono down-text ns-cell" : "mono muted ns-cell"}>
        {nsFail ?? (row.dns?.ns?.length ? row.dns.ns.join(" · ") : "—")}
      </td>
      <td data-label="SSL" className={sslCellClass(row)}>
        {sslLabel(row)}
      </td>
      <td data-label="время" className="mono">
        {formatMs(row.duration)}
      </td>
    </tr>
  );
}
