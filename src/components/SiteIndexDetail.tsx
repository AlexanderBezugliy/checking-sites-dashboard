import { formatKyiv } from "../lib/format";
import { dropTargetLabel } from "../lib/drop";
import {
  indexCanonicalHint,
  indexErrorLabel,
  indexHomeStatusLabel,
  indexReportPages,
  isIndexSkip,
  pageIndexKind,
  pageIndexLabel,
  pageSlotLabel,
} from "../lib/index";
import { subfolderOf } from "../lib/subfolder";
import type { IndexPage, SiteRow } from "../types";

export function SiteIndexDetail({
  row,
  isDrop = false,
}: {
  row: SiteRow;
  isDrop?: boolean;
}) {
  return (
    <div className="index-detail">
      {isDrop ? (
        <p className="index-detail-drop">
          дроп · 301 на {dropTargetLabel(row) || "money-сайт"}
        </p>
      ) : null}
      {isDrop ? <DropIndexBody row={row} /> : <DefaultIndexBody row={row} />}
    </div>
  );
}

function DropIndexBody({ row }: { row: SiteRow }) {
  return (
    <>
      <p className="index-detail-home">
        главная · {indexHomeStatusLabel(row)}
      </p>
      <IndexPagesBlock row={row} />
    </>
  );
}

function DefaultIndexBody({ row }: { row: SiteRow }) {
  const info = row.index;
  if (isIndexSkip(row)) {
    return (
      <p className="index-detail-skip">
        {indexErrorLabel(info?.error) || "нет GSC / skip"}
      </p>
    );
  }
  if (!info) {
    return <p className="index-detail-skip muted">Нет данных индексации</p>;
  }
  return <IndexPagesBlock row={row} />;
}

function IndexPagesBlock({ row }: { row: SiteRow }) {
  const pages = indexReportPages(row);
  const folder = subfolderOf(row)?.folder ?? null;
  if (!pages.length) {
    return <p className="caption">Внутренние URL ещё не проверялись.</p>;
  }
  return (
    <div className="index-detail-scroll">
      <table className="index-pages">
        <thead>
          <tr>
            <th>страница</th>
            <th>статус</th>
            <th>coverage</th>
            <th>проверка</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <IndexPageRow key={page.url} page={page} folder={folder} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndexPageRow({
  page,
  folder,
}: {
  page: IndexPage;
  folder: string | null;
}) {
  const kind = pageIndexKind(page);
  const slot = pageSlotLabel(page);
  const canonical = indexCanonicalHint(page, folder);
  return (
    <tr className={`index-page-${kind}`}>
      <td className="index-page-url">
        <span className="index-slot">{slot}</span>
        <a href={page.url} target="_blank" rel="noreferrer">
          {page.url.replace(/^https?:\/\//, "")}
        </a>
      </td>
      <td>
        <span className={`status index-page-badge ${kind}`}>
          <i />
          {pageIndexLabel(page)}
        </span>
        {page.stale && page.status_from ? (
          <span className="index-stale-from">с {formatKyiv(page.status_from)}</span>
        ) : null}
        {page.error ? (
          <span className="index-page-error">{indexErrorLabel(page.error)}</span>
        ) : null}
      </td>
      <td className="mono muted index-coverage-cell">
        <span>{page.coverageState || "—"}</span>
        {canonical ? (
          <span className="index-canonical">каноникал {canonical}</span>
        ) : null}
      </td>
      <td className="mono muted">
        {page.checked_at ? formatKyiv(page.checked_at) : "—"}
      </td>
    </tr>
  );
}
