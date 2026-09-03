import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { formatMs, formatRowCount } from "../lib/format";
import {
  indexHomeLabel,
  indexKind,
  isIndexAutoExpand,
  isIndexSkip,
} from "../lib/index";
import {
  formatNsHosts,
  hostnameOf,
  nsMatchOf,
  nsReason,
  sslDaysLeft,
  sslLabel,
  SSL_WARN_DAYS,
  statusKind,
  statusKindLabel,
  statusLabel,
  zoneOf,
} from "../lib/site";
import { filterAndSortRows, hasIndexColumn, nextSort } from "../lib/table";
import type { Metrics, SiteRow, SortDir, SortKey, TableFilter } from "../types";
import { SiteIndexDetail } from "./SiteIndexDetail";

const MOBILE_PAGE = 10;
const MOBILE_TABLE = "(max-width: 720px)";

const FILTERS: TableFilter[] = [
  "all",
  "200",
  "302",
  "503",
  "down",
  "ns",
  "nsok",
  "nsbad",
  "nsskip",
  "ssl",
  "indexok",
  "indexbad",
  "indexpartial",
  "indexstale",
  "indexnoindex",
  "indexskip",
  "indexunknown",
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "host", label: "хост" },
  { key: "status", label: "HTTP" },
  { key: "zone", label: "зона" },
  { key: "ssl", label: "SSL" },
  { key: "index", label: "индекс" },
  { key: "duration", label: "время" },
];

function filterCaption(id: TableFilter, metrics: Metrics): string {
  if (id === "all") return `все ${metrics.total}`;
  if (id === "200") return `200 · ${metrics.http200}`;
  if (id === "302") return `302 · ${metrics.http302}`;
  if (id === "503") return `503 · ${metrics.cloak503}`;
  if (id === "ns") return `NS · ${metrics.nsProblems.length}`;
  if (id === "nsok") return `совпало · ${metrics.nsMatchOk}`;
  if (id === "nsbad") return `не совпало · ${metrics.nsMatchBad}`;
  if (id === "nsskip") return `без эталона · ${metrics.nsMatchSkip}`;
  if (id === "ssl") return `SSL · ${metrics.sslErrors + metrics.sslSoon}`;
  if (id === "indexok") return `индекс ✓ · ${metrics.homesIndexed}`;
  if (id === "indexbad") return `не в индексе · ${metrics.homesNotIndexed}`;
  if (id === "indexpartial") return `частично · ${metrics.homesPartial}`;
  if (id === "indexstale") return `stale · ${metrics.homesStale}`;
  if (id === "indexnoindex") return `noindex · ${metrics.homesNoindex}`;
  if (id === "indexskip") return `skip · ${metrics.homesSkip}`;
  if (id === "indexunknown") return `нет ответа · ${metrics.homesUnknown}`;
  return `падения · ${metrics.failed}`;
}

export function SiteTable({
  rows,
  metrics,
  filter,
  jumpToken = 0,
  extendedIndex = false,
  onExtendedIndexChange,
  onFilterChange,
}: {
  rows: SiteRow[];
  metrics: Metrics;
  filter: TableFilter;
  jumpToken?: number;
  extendedIndex?: boolean;
  onExtendedIndexChange?: (value: boolean) => void;
  onFilterChange: (filter: TableFilter) => void;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("duration");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const compact = useMediaQuery(MOBILE_TABLE);
  const wrapRef = useRef<HTMLElement>(null);
  const showIndex = hasIndexColumn(rows);
  const listKey = `${filter}|${query}|${sortKey}|${sortDir}|${extendedIndex}`;
  const [paging, setPaging] = useState({ listKey, shown: MOBILE_PAGE });
  if (paging.listKey !== listKey) {
    setPaging({ listKey, shown: MOBILE_PAGE });
  }
  const shown = paging.listKey === listKey ? paging.shown : MOBILE_PAGE;

  const visible = useMemo(
    () => filterAndSortRows(rows, query, filter, sortKey, sortDir),
    [rows, query, filter, sortKey, sortDir],
  );

  const pageRows = compact ? visible.slice(0, shown) : visible;
  const remaining = compact ? Math.max(0, visible.length - pageRows.length) : 0;

  useEffect(() => {
    if (!jumpToken) return;
    const node = wrapRef.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    if (reduced) return;
    node.classList.remove("is-jump");
    void node.offsetWidth;
    node.classList.add("is-jump");
  }, [jumpToken]);

  useEffect(() => {
    if (!extendedIndex) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        if (isIndexAutoExpand(row)) next[row.url] = true;
      }
      return next;
    });
  }, [extendedIndex, rows]);

  function toggleSort(key: SortKey) {
    const next = nextSort(sortKey, sortDir, key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  }

  function toggleRow(url: string) {
    setExpanded((prev) => ({ ...prev, [url]: !prev[url] }));
  }

  const colSpan = showIndex ? 8 : 7;

  return (
    <section
      id="site-table"
      ref={wrapRef}
      className="table-wrap reveal delay-5"
      onAnimationEnd={(event) => {
        if (event.animationName === "table-arrive") {
          event.currentTarget.classList.remove("is-jump");
        }
      }}
    >
      <div className="toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по домену, NS или индексу…"
          aria-label="Поиск по домену, NS или индексу"
        />
        {showIndex && onExtendedIndexChange ? (
          <label className="index-toggle">
            <input
              type="checkbox"
              checked={extendedIndex}
              onChange={(event) => onExtendedIndexChange(event.target.checked)}
            />
            <span>Расширенный режим</span>
          </label>
        ) : null}
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
        <p className="count">
          {compact && remaining > 0
            ? `${pageRows.length} из ${visible.length}`
            : formatRowCount(visible.length)}
        </p>
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
              {showIndex ? (
                <SortTh
                  label="индекс"
                  active={sortKey === "index"}
                  dir={sortDir}
                  onClick={() => toggleSort("index")}
                />
              ) : null}
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
            {pageRows.map((row, index) => (
              <SiteRowBlock
                key={`${row.url}-${index}`}
                row={row}
                showIndex={showIndex}
                colSpan={colSpan}
                expanded={Boolean(expanded[row.url])}
                onToggle={() => toggleRow(row.url)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {remaining > 0 ? (
        <div className="table-more">
          <button
            type="button"
            onClick={() =>
              setPaging((prev) => ({
                listKey,
                shown: (prev.listKey === listKey ? prev.shown : MOBILE_PAGE) + MOBILE_PAGE,
              }))
            }
          >
            Загрузить ещё {Math.min(MOBILE_PAGE, remaining)}
          </button>
        </div>
      ) : null}
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

function indexCellClass(row: SiteRow): string {
  const kind = indexKind(row);
  if (kind === "ok") return "mono ok-text index-cell";
  if (kind === "partial") return "mono cloak-text index-cell";
  if (kind === "bad") return "mono down-text index-cell";
  if (kind === "noindex") return "mono muted index-cell index-noindex";
  if (kind === "stale" || kind === "unknown") return "mono cloak-text index-cell";
  if (kind === "skip") return "mono muted index-cell";
  return "mono muted index-cell";
}

function SiteRowBlock({
  row,
  showIndex,
  colSpan,
  expanded,
  onToggle,
}: {
  row: SiteRow;
  showIndex: boolean;
  colSpan: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const kind = statusKind(row);
  const nsFail = nsReason(row);
  const match = nsMatchOf(row);
  const indexRowKind = indexKind(row);
  const tone = nsFail
    ? "ns-bad"
    : kind === "down"
      ? "down"
      : match === false
        ? "ns-mismatch"
        : indexRowKind === "bad"
          ? "index-bad"
          : indexRowKind === "partial" || indexRowKind === "stale"
            ? "index-warn"
            : kind;
  const canExpand = showIndex && (row.index != null || isIndexSkip(row));

  return (
    <Fragment>
      <tr
        className={`${tone}${expanded ? " is-expanded" : ""}${canExpand ? " is-expandable" : ""}`}
        onClick={canExpand ? onToggle : undefined}
        onKeyDown={
          canExpand
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
        tabIndex={canExpand ? 0 : undefined}
        aria-expanded={canExpand ? expanded : undefined}
      >
        <td data-label="состояние">
          <span className={`status ${nsFail ? "down" : kind}`}>
            <i />
            {nsFail ? "NS ошибка" : statusKindLabel(kind)}
          </span>
        </td>
        <td data-label="хост" className="host-cell">
          <a
            href={row.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            {hostnameOf(row.url)}
          </a>
          {canExpand ? (
            <span className="row-expand-hint">{expanded ? "▾" : "▸"}</span>
          ) : null}
        </td>
        <td data-label="HTTP" className="mono">
          {statusLabel(row)}
        </td>
        <td data-label="зона" className="mono">
          {zoneOf(row.url)}
        </td>
        <NsCell row={row} nsFail={nsFail} match={match} />
        {showIndex ? (
          <td data-label="индекс" className={indexCellClass(row)}>
            <IndexCell row={row} />
          </td>
        ) : null}
        <td data-label="SSL" className={sslCellClass(row)}>
          {sslLabel(row)}
        </td>
        <td data-label="время" className="mono">
          {formatMs(row.duration)}
        </td>
      </tr>
      {expanded && canExpand ? (
        <tr className="index-detail-row">
          <td colSpan={colSpan}>
            <SiteIndexDetail row={row} />
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function IndexCell({ row }: { row: SiteRow }) {
  const kind = indexKind(row);
  const label = indexHomeLabel(row);
  return (
    <div className="index-check">
      {kind === "noindex" ? (
        <span className="status warn index-badge">
          <i />
          noindex
        </span>
      ) : null}
      {kind === "stale" ? (
        <span className="status warn index-badge">
          <i />
          stale
        </span>
      ) : null}
      <span className="index-label">{label}</span>
    </div>
  );
}

function NsCell({
  row,
  nsFail,
  match,
}: {
  row: SiteRow;
  nsFail: string | null;
  match: ReturnType<typeof nsMatchOf>;
}) {
  const live = row.dns?.ns ?? [];

  return (
    <td data-label="NS" className={nsFail ? "mono down-text ns-cell" : "mono muted ns-cell"}>
      {match === false ? (
        <div className="ns-check is-bad">
          <span className="status down ns-badge">
            <i />
            не совпало
          </span>
          <p className="ns-pair">
            ожидалось: {formatNsHosts(row.ns_expected)}
          </p>
          <p className="ns-pair">
            сейчас: {formatNsHosts(live, "не резолвится")}
          </p>
        </div>
      ) : (
        <div className="ns-check">
          {match === true ? (
            <span className="status ok ns-badge">
              <i />
              ОК
            </span>
          ) : null}
          <span className="ns-live">
            {nsFail ?? formatNsHosts(live)}
          </span>
        </div>
      )}
    </td>
  );
}
