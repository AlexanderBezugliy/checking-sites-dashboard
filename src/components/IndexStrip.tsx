import type { ReactNode } from "react";
import type { Metrics, IndexProblem } from "../types";
import { ShinyButton } from "./ShinyButton";

export function IndexStrip({
  metrics,
  onShowBad,
  onShowPartial,
  onShowStale,
  onShowNoindex,
  onShowSkip,
  onShowUnknown,
}: {
  metrics: Metrics;
  onShowBad?: () => void;
  onShowPartial?: () => void;
  onShowStale?: () => void;
  onShowNoindex?: () => void;
  onShowSkip?: () => void;
  onShowUnknown?: () => void;
}) {
  const withData =
    metrics.homesIndexed +
    metrics.homesNotIndexed +
    metrics.homesUnknown +
    metrics.homesStale +
    metrics.homesNoindex +
    metrics.homesSkip;
  const troubled =
    metrics.homesNotIndexed + metrics.homesStale + metrics.homesPartial;
  const tone = metrics.homesNotIndexed
    ? "alert"
    : metrics.homesStale || metrics.homesPartial
      ? "warn"
      : "ok";

  return (
    <section className={`index-strip ${tone} reveal delay-1`}>
      <div className="index-top">
        <div className="index-head">
          <h2>Google Index</h2>
          {troubled ? (
            <p className="index-status down">
              {troubled} из {withData || metrics.total} с проблемами индекса
            </p>
          ) : (
            <p className="index-status ok">
              Главные в индексе: {metrics.homesIndexed}
              {metrics.homesNoindex ? ` · noindex: ${metrics.homesNoindex}` : ""}
            </p>
          )}
          <p className="index-fleet caption">
            Страниц проверено {metrics.pagesCheckedTotal} · в индексе{" "}
            {metrics.pagesIndexedTotal}
            {metrics.indexQueueCursor != null
              ? ` · очередь URL: ${metrics.indexQueueCursor}`
              : null}
          </p>
        </div>

        <ul className="index-stats">
          <li className="is-ok">
            <span>главная ✓</span>
            <b>{metrics.homesIndexed}</b>
          </li>
          <li className={metrics.homesNotIndexed ? "is-down" : "is-ok"}>
            <span>не в индексе</span>
            <b>{metrics.homesNotIndexed}</b>
          </li>
          <li className={metrics.homesPartial ? "is-warn" : undefined}>
            <span>частично</span>
            <b>{metrics.homesPartial}</b>
          </li>
          <li className={metrics.homesStale ? "is-warn" : undefined}>
            <span>stale</span>
            <b>{metrics.homesStale}</b>
          </li>
          <li>
            <span>noindex</span>
            <b>{metrics.homesNoindex}</b>
          </li>
          <li>
            <span>skip</span>
            <b>{metrics.homesSkip}</b>
          </li>
          <li>
            <span>нет ответа</span>
            <b>{metrics.homesUnknown}</b>
          </li>
        </ul>
      </div>

      {metrics.indexProblems.length ? (
        <div className="index-board">
          {metrics.homesNotIndexed ? (
            <IssueBlock
              title="Главная не в индексе"
              tone="down"
              columns={["хост", "причина", "проверено"]}
              onShow={onShowBad}
              more={
                metrics.homesNotIndexed > 8
                  ? `Ещё ${metrics.homesNotIndexed - 8} — фильтр «не в индексе»`
                  : null
              }
            >
              {metrics.indexBad.slice(0, 8).map((item, index) => (
                <ProblemItem key={`${item.url}-${index}`} item={item} />
              ))}
            </IssueBlock>
          ) : null}

          {metrics.indexPartial.length ? (
            <IssueBlock
              title="Частичная индексация"
              tone="warn"
              columns={["хост", "детали", "проверено"]}
              onShow={onShowPartial}
              more={
                metrics.indexPartial.length > 8
                  ? `Ещё ${metrics.indexPartial.length - 8} — фильтр «частично»`
                  : null
              }
            >
              {metrics.indexPartial.slice(0, 8).map((item, index) => (
                <ProblemItem
                  key={`${item.url}-${index}`}
                  item={item}
                  reasonLabel="детали"
                />
              ))}
            </IssueBlock>
          ) : null}

          {metrics.indexStale.length ? (
            <IssueBlock
              title="Stale / Google не ответил"
              tone="warn"
              columns={["хост", "причина", "проверено"]}
              onShow={onShowStale}
              more={
                metrics.indexStale.length > 8
                  ? `Ещё ${metrics.indexStale.length - 8} — фильтр «stale»`
                  : null
              }
            >
              {metrics.indexStale.slice(0, 8).map((item, index) => (
                <ProblemItem key={`${item.url}-${index}`} item={item} />
              ))}
            </IssueBlock>
          ) : null}

          {metrics.homesNoindex || metrics.homesSkip || metrics.homesUnknown ? (
            <div className="index-quick">
              {metrics.homesNoindex ? (
                <button type="button" onClick={onShowNoindex}>
                  noindex · {metrics.homesNoindex}
                </button>
              ) : null}
              {metrics.homesSkip ? (
                <button type="button" onClick={onShowSkip}>
                  skip · {metrics.homesSkip}
                </button>
              ) : null}
              {metrics.homesUnknown ? (
                <button type="button" onClick={onShowUnknown}>
                  нет ответа · {metrics.homesUnknown}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function IssueBlock({
  title,
  tone,
  columns,
  onShow,
  more,
  children,
}: {
  title: string;
  tone: "warn" | "down";
  columns: [string, string, string];
  onShow?: () => void;
  more: string | null;
  children: ReactNode;
}) {
  return (
    <div className={`index-issues ${tone}`}>
      <div className="index-issues-head">
        <h3>{title}</h3>
        {onShow ? (
          <ShinyButton className="btn-show-table" onClick={onShow}>
            Показать в таблице
          </ShinyButton>
        ) : null}
      </div>
      <div className="index-issues-cols" aria-hidden="true">
        <span>{columns[0]}</span>
        <span>{columns[1]}</span>
        <span>{columns[2]}</span>
      </div>
      <ul>{children}</ul>
      {more ? <p className="caption">{more}</p> : null}
    </div>
  );
}

function ProblemItem({
  item,
  reasonLabel = "причина",
}: {
  item: IndexProblem;
  reasonLabel?: string;
}) {
  return (
    <li>
      <a href={item.url} target="_blank" rel="noreferrer">
        {item.host}
      </a>
      <p className="index-pair" data-label={reasonLabel}>
        {item.reason}
      </p>
      <p className="index-pair" data-label="проверено">
        {item.ratio}
      </p>
    </li>
  );
}
