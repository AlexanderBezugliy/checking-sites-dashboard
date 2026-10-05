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
import { isIndexSubmitPage } from "../lib/indexQueue";
import { subfolderOf } from "../lib/subfolder";
import type { IndexPage, SiteRow } from "../types";

export function SiteIndexDetail({
  row,
  isDrop = false,
  sentUrls,
  picked,
  busy = false,
  onTogglePage,
}: {
  row: SiteRow;
  isDrop?: boolean;
  sentUrls?: ReadonlySet<string>;
  picked?: Readonly<Record<string, true>>;
  busy?: boolean;
  onTogglePage?: (url: string) => void;
}) {
  return (
    <div className="index-detail">
      {isDrop ? (
        <p className="index-detail-drop">
          дроп · 301 на {dropTargetLabel(row) || "money-сайт"}
        </p>
      ) : null}
      {isDrop ? (
        <DropIndexBody
          row={row}
          sentUrls={sentUrls}
          picked={picked}
          busy={busy}
          onTogglePage={onTogglePage}
        />
      ) : (
        <DefaultIndexBody
          row={row}
          sentUrls={sentUrls}
          picked={picked}
          busy={busy}
          onTogglePage={onTogglePage}
        />
      )}
    </div>
  );
}

function DropIndexBody({
  row,
  sentUrls,
  picked,
  busy,
  onTogglePage,
}: {
  row: SiteRow;
  sentUrls?: ReadonlySet<string>;
  picked?: Readonly<Record<string, true>>;
  busy: boolean;
  onTogglePage?: (url: string) => void;
}) {
  return (
    <>
      <p className="index-detail-home">
        главная · {indexHomeStatusLabel(row)}
      </p>
      <IndexPagesBlock
        row={row}
        sentUrls={sentUrls}
        picked={picked}
        busy={busy}
        onTogglePage={onTogglePage}
      />
    </>
  );
}

function DefaultIndexBody({
  row,
  sentUrls,
  picked,
  busy,
  onTogglePage,
}: {
  row: SiteRow;
  sentUrls?: ReadonlySet<string>;
  picked?: Readonly<Record<string, true>>;
  busy: boolean;
  onTogglePage?: (url: string) => void;
}) {
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
  return (
    <IndexPagesBlock
      row={row}
      sentUrls={sentUrls}
      picked={picked}
      busy={busy}
      onTogglePage={onTogglePage}
    />
  );
}

function IndexPagesBlock({
  row,
  sentUrls,
  picked,
  busy,
  onTogglePage,
}: {
  row: SiteRow;
  sentUrls?: ReadonlySet<string>;
  picked?: Readonly<Record<string, true>>;
  busy: boolean;
  onTogglePage?: (url: string) => void;
}) {
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
            {onTogglePage ? <th className="index-page-pick" /> : null}
            <th className="index-page-url">страница</th>
            <th>статус</th>
            <th>coverage</th>
            <th>проверка</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <IndexPageRow
              key={page.url}
              page={page}
              folder={folder}
              sent={Boolean(page.url && sentUrls?.has(page.url))}
              picked={Boolean(page.url && picked?.[page.url])}
              busy={busy}
              onTogglePage={onTogglePage}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndexPageRow({
  page,
  folder,
  sent,
  picked,
  busy,
  onTogglePage,
}: {
  page: IndexPage;
  folder: string | null;
  sent: boolean;
  picked: boolean;
  busy: boolean;
  onTogglePage?: (url: string) => void;
}) {
  const kind = pageIndexKind(page);
  const slot = pageSlotLabel(page);
  const canonical = indexCanonicalHint(page, folder);
  const canPick = isIndexSubmitPage(page) && !sent;
  return (
    <tr className={`index-page-${kind}`}>
      {onTogglePage ? (
        <td className="index-page-pick">
          <input
            type="checkbox"
            className="index-pick"
            checked={canPick && picked}
            disabled={!canPick || busy}
            aria-label={
              sent
                ? `Уже отправлено: ${page.url}`
                : canPick
                  ? `Выбрать ${page.url}`
                  : `Уже в индексе: ${page.url}`
            }
            onClick={(event) => event.stopPropagation()}
            onChange={() => onTogglePage(page.url)}
          />
        </td>
      ) : null}
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
