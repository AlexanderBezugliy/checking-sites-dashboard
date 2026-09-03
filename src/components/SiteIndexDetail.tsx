import { formatKyiv } from "../lib/format";
import {
  indexErrorLabel,
  indexPages,
  indexRatioLabel,
  isIndexSkip,
  pageIndexKind,
  pageIndexLabel,
} from "../lib/index";
import type { SiteRow } from "../types";

export function SiteIndexDetail({ row }: { row: SiteRow }) {
  const info = row.index;
  if (isIndexSkip(row)) {
    return (
      <div className="index-detail">
        <p className="index-detail-skip">
          {indexErrorLabel(info?.error) || "нет GSC / skip"}
        </p>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="index-detail">
        <p className="index-detail-skip muted">Нет данных индексации</p>
      </div>
    );
  }

  const pages = indexPages(row);
  const sitemapTotal = info.sitemap?.urls?.length ?? info.pages_total ?? 0;

  return (
    <div className="index-detail">
      <div className="index-detail-meta">
        <p>
          <span className="label">Главная</span>
          <strong>{info.coverageState || "—"}</strong>
        </p>
        <p>
          <span className="label">Проверено</span>
          <strong>{indexRatioLabel(row)}</strong>
          {sitemapTotal ? (
            <em>
              {" "}
              · в sitemap {sitemapTotal}
              {info.pages_checked != null && info.pages_checked < sitemapTotal
                ? ` · очередь ${info.pages_checked}/${sitemapTotal}`
                : null}
            </em>
          ) : null}
        </p>
        {info.checked_at ? (
          <p>
            <span className="label">Проверка</span>
            <strong>{formatKyiv(info.checked_at)}</strong>
          </p>
        ) : null}
        {info.error ? (
          <p className="index-detail-error">{indexErrorLabel(info.error)}</p>
        ) : null}
      </div>

      {pages.length ? (
        <div className="index-detail-scroll">
          <table className="index-pages">
            <thead>
              <tr>
                <th>URL</th>
                <th>статус</th>
                <th>coverage</th>
                <th>проверка</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const kind = pageIndexKind(page);
                return (
                  <tr key={page.url} className={`index-page-${kind}`}>
                    <td className="index-page-url">
                      <a href={page.url} target="_blank" rel="noreferrer">
                        {page.url.replace(/^https?:\/\//, "")}
                      </a>
                      {page.slot ? (
                        <span className="index-slot">{page.slot}</span>
                      ) : null}
                    </td>
                    <td>
                      <span className={`status index-page-badge ${kind}`}>
                        <i />
                        {pageIndexLabel(page)}
                      </span>
                      {page.stale && page.status_from ? (
                        <span className="index-stale-from">
                          с {formatKyiv(page.status_from)}
                        </span>
                      ) : null}
                      {page.error ? (
                        <span className="index-page-error">
                          {indexErrorLabel(page.error)}
                        </span>
                      ) : null}
                    </td>
                    <td className="mono muted">{page.coverageState || "—"}</td>
                    <td className="mono muted">
                      {page.checked_at ? formatKyiv(page.checked_at) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="caption">Внутренние URL ещё не проверялись.</p>
      )}
    </div>
  );
}
