import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { formatMs } from "../lib/format";
import {
  indexHomeLabel,
  indexKind,
  isIndexSkip,
} from "../lib/index";
import {
  hostnameOf,
  isSiteUp,
  nsMatchOf,
  nsReason,
  sslDaysLeft,
  sslLabel,
  SSL_WARN_DAYS,
} from "../lib/site";
import {
  cloakHint,
  cloakLabel,
  cloakOf,
  hasCloakColumn,
  isCloaked,
} from "../lib/cloak";
import {
  hasSubfolderColumn,
  subfolderFolderLabel,
  subfolderGlueLabel,
  subfolderHint,
  subfolderOf,
} from "../lib/subfolder";
import { filterAndSortRows, hasIndexColumn, nextSort } from "../lib/table";
import type { Metrics, SiteRow, SortDir, SortKey, TableFilter } from "../types";
import { MenuSelect, type MenuGroup } from "./MenuSelect";
import { SiteIndexDetail } from "./SiteIndexDetail";

const PREVIEW_ROWS = 10;
const MOBILE_TABLE = "(max-width: 720px)";

const FILTER_HTTP: TableFilter[] = ["all", "200", "302", "503", "down", "ssl"];
const FILTER_NS: TableFilter[] = ["ns", "nsok", "nsbad", "nsskip"];
const FILTER_INDEX: TableFilter[] = [
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
  { key: "ssl", label: "SSL" },
  { key: "index", label: "индекс" },
  { key: "duration", label: "время" },
];

function filterCaption(
  id: TableFilter,
  metrics: Metrics,
): { label: string; count: number } {
  if (id === "all") return { label: "все", count: metrics.total };
  if (id === "200") return { label: "200", count: metrics.http200 };
  if (id === "302") return { label: "302", count: metrics.http302 };
  if (id === "503") return { label: "503", count: metrics.cloak503 };
  if (id === "ns") return { label: "NS", count: metrics.nsProblems.length };
  if (id === "nsok") return { label: "совпало", count: metrics.nsMatchOk };
  if (id === "nsbad") return { label: "не совпало", count: metrics.nsMatchBad };
  if (id === "nsskip") return { label: "без эталона", count: metrics.nsMatchSkip };
  if (id === "ssl") return { label: "SSL", count: metrics.sslErrors + metrics.sslSoon };
  if (id === "indexok") return { label: "индекс ✓", count: metrics.homesIndexed };
  if (id === "indexbad") return { label: "не в индексе", count: metrics.homesNotIndexed };
  if (id === "indexpartial") return { label: "частично", count: metrics.homesPartial };
  if (id === "indexstale") return { label: "stale", count: metrics.homesStale };
  if (id === "indexnoindex") return { label: "noindex", count: metrics.homesNoindex };
  if (id === "indexskip") return { label: "skip", count: metrics.homesSkip };
  if (id === "indexunknown") return { label: "нет ответа", count: metrics.homesUnknown };
  return { label: "падения", count: metrics.failed };
}

function filterOptions(
  ids: TableFilter[],
  metrics: Metrics,
): MenuGroup<TableFilter>["options"] {
  return ids.map((id) => {
    const { label, count } = filterCaption(id, metrics);
    return { id, label, count };
  });
}

function filterGroups(metrics: Metrics, showIndex: boolean): MenuGroup<TableFilter>[] {
  const groups: MenuGroup<TableFilter>[] = [
    { id: "http", label: "HTTP", options: filterOptions(FILTER_HTTP, metrics) },
    { id: "ns", label: "NS", options: filterOptions(FILTER_NS, metrics) },
  ];
  if (showIndex) {
    groups.push({
      id: "index",
      label: "индекс",
      options: filterOptions(FILTER_INDEX, metrics),
    });
  }
  return groups;
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
  const showSubfolder = hasSubfolderColumn(rows);
  const showCloak = hasCloakColumn(rows);

  const visible = useMemo(
    () => filterAndSortRows(rows, query, filter, sortKey, sortDir),
    [rows, query, filter, sortKey, sortDir],
  );

  const pageRows = extendedIndex ? visible : visible.slice(0, PREVIEW_ROWS);

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

  function toggleSort(key: SortKey) {
    const next = nextSort(sortKey, sortDir, key);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
  }

  function toggleRow(url: string) {
    setExpanded((prev) => ({ ...prev, [url]: !prev[url] }));
  }

  const colSpan =
    5 + (showIndex ? 1 : 0) + (showSubfolder ? 2 : 0) + (showCloak ? 1 : 0);
  const sortChoices = showIndex
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((option) => option.key !== "index");
  const sortLabel = sortChoices.find((option) => option.key === sortKey)?.label ?? sortKey;
  const activeFilter = filterCaption(filter, metrics);

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
          placeholder={
            showSubfolder
              ? "Поиск по домену, NS, индексу или подпапке…"
              : "Поиск по домену, NS или индексу…"
          }
          aria-label={
            showSubfolder
              ? "Поиск по домену, NS, индексу или подпапке"
              : "Поиск по домену, NS или индексу"
          }
        />
        <MenuSelect
          label="фильтр"
          value={filter}
          valueLabel={activeFilter.label}
          valueCount={activeFilter.count}
          groups={filterGroups(metrics, showIndex)}
          onChange={onFilterChange}
        />
        {compact ? (
          <MenuSelect
            label="сортировка"
            value={sortKey}
            valueLabel={`${sortLabel}${sortDir === "asc" ? " ↑" : " ↓"}`}
            groups={[
              {
                id: "sort",
                options: sortChoices.map((option) => ({
                  id: option.key,
                  label:
                    option.key === sortKey
                      ? `${option.label}${sortDir === "asc" ? " ↑" : " ↓"}`
                      : option.label,
                })),
              },
            ]}
            onChange={toggleSort}
          />
        ) : null}
        {onExtendedIndexChange ? (
          <label className="index-toggle">
            <input
              type="checkbox"
              checked={extendedIndex}
              onChange={(event) => onExtendedIndexChange(event.target.checked)}
            />
            <span>Расширенный режим</span>
          </label>
        ) : null}
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
              {showCloak ? <th>клоака</th> : null}
              {showSubfolder ? (
                <>
                  <th>подпапка</th>
                  <th>склейка</th>
                </>
              ) : null}
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
                showSubfolder={showSubfolder}
                showCloak={showCloak}
                colSpan={colSpan}
                expanded={Boolean(expanded[row.url])}
                onToggle={() => toggleRow(row.url)}
              />
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

function SiteRowBlock({
  row,
  showIndex,
  showSubfolder,
  showCloak,
  colSpan,
  expanded,
  onToggle,
}: {
  row: SiteRow;
  showIndex: boolean;
  showSubfolder: boolean;
  showCloak: boolean;
  colSpan: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const nsFail = nsReason(row);
  const match = nsMatchOf(row);
  const indexRowKind = indexKind(row);
  const up = isSiteUp(row);
  const tone = !up
    ? "down"
    : nsFail
      ? "ns-bad"
      : match === false
        ? "ns-mismatch"
        : indexRowKind === "bad"
          ? "index-bad"
          : indexRowKind === "partial" || indexRowKind === "stale"
            ? "index-warn"
            : "";
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
          <span className="status-lead">
            {canExpand ? (
              <span className={expanded ? "row-expand is-open" : "row-expand"} aria-hidden>
                <span className="row-expand-label">view</span>
                <span className="row-expand-hint" />
              </span>
            ) : (
              <span className="row-expand is-placeholder" aria-hidden>
                <span className="row-expand-label">view</span>
                <span className="row-expand-hint" />
              </span>
            )}
            <span
              className={`status-dot ${up ? "ok" : "down"}`}
              aria-label={up ? "живой" : "падение"}
            >
              <i />
            </span>
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
        </td>
        {showCloak ? <CloakCell row={row} /> : null}
        {showSubfolder ? <SubfolderCells row={row} /> : null}
        <NsCell row={row} nsFail={nsFail} />
        {showIndex ? (
          <td data-label="индекс" className="mono index-cell">
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
  return <span className="index-label">{indexHomeLabel(row)}</span>;
}

function CloakCell({ row }: { row: SiteRow }) {
  const info = cloakOf(row);
  const hint = cloakHint(info);
  const on = isCloaked(row);
  return (
    <td
      data-label="клоака"
      className={on ? "mono cloak-text" : "mono muted"}
      title={hint}
    >
      {cloakLabel(info)}
    </td>
  );
}

function SubfolderCells({ row }: { row: SiteRow }) {
  const info = subfolderOf(row);
  const folder = subfolderFolderLabel(info);
  const hint = subfolderHint(info);
  const glue = subfolderGlueLabel(info?.glue);
  return (
    <>
      <td data-label="подпапка" className="mono subfolder-cell" title={hint}>
        {folder}
      </td>
      <td data-label="склейка" className="mono muted">
        {glue}
      </td>
    </>
  );
}

function NsCell({
  row,
  nsFail,
}: {
  row: SiteRow;
  nsFail: string | null;
}) {
  const live = row.dns?.ns ?? [];

  return (
    <td data-label="NS" className="mono muted ns-cell">
      {live.length ? (
        <div className="ns-names">
          {live.map((name) => (
            <p key={name}>{name}</p>
          ))}
        </div>
      ) : (
        <span className="ns-live">{nsFail ?? "—"}</span>
      )}
    </td>
  );
}
