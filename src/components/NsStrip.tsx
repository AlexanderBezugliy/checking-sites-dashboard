import type { ReactNode } from "react";
import { formatNsHosts } from "../lib/site";
import type { Metrics, NsMismatch, NsProblem } from "../types";

export function NsStrip({
  metrics,
  onShowProblems,
  onShowMismatches,
}: {
  metrics: Metrics;
  onShowProblems?: () => void;
  onShowMismatches?: () => void;
}) {
  const failed = metrics.nsProblems.length;
  const ok = metrics.nsOk;
  const mismatched = metrics.nsMatchBad;
  const tone = failed ? "alert" : mismatched ? "warn" : "ok";

  return (
    <section className={`ns-strip ${tone} reveal delay-1`}>
      <div className="ns-top">
        <div className="ns-head">
          <h2>NS-серверы</h2>
          {failed ? (
            <p className="ns-status down">
              {failed} из {metrics.total} с ошибкой DNS/NS
            </p>
          ) : (
            <p className="ns-status ok">
              Все {ok} доменов резолвятся — NS отвечают
            </p>
          )}
        </div>

        <ul className="ns-stats">
          <li className="is-ok">
            <span>ОК</span>
            <b>{metrics.nsMatchOk}</b>
          </li>
          <li className={mismatched ? "is-down" : "is-ok"}>
            <span>не совпало</span>
            <b>{mismatched}</b>
          </li>
          <li>
            <span>без эталона</span>
            <b>{metrics.nsMatchSkip}</b>
          </li>
        </ul>

        <ul className="ns-providers">
          {metrics.nsProviders.map((item) => (
            <li key={item.name}>
              <span>{item.name}</span>
              <em>{item.count}</em>
            </li>
          ))}
          {metrics.nsProviders.length === 0 ? <li>Нет NS-записей</li> : null}
        </ul>
      </div>

      {mismatched || failed ? (
        <div className="ns-board">
          {mismatched ? (
            <IssueBlock
              title="Не совпало с эталоном"
              tone="warn"
              columns={["хост", "ожидалось", "сейчас"]}
              onShow={onShowMismatches}
              more={
                mismatched > 8
                  ? `Ещё ${mismatched - 8} — фильтр «не совпало»`
                  : null
              }
            >
              {metrics.nsMismatches.slice(0, 8).map((item, index) => (
                <MismatchItem key={`${item.url}-${index}`} item={item} />
              ))}
            </IssueBlock>
          ) : null}

          {failed ? (
            <IssueBlock
              title="Что сломано"
              tone="down"
              columns={["хост", "причина", "NS"]}
              onShow={onShowProblems}
              more={
                failed > 8 ? `Ещё ${failed - 8} — откройте фильтр NS` : null
              }
            >
              {metrics.nsProblems.slice(0, 8).map((item, index) => (
                <ProblemItem key={`${item.url}-${index}`} item={item} />
              ))}
            </IssueBlock>
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
    <div className={`ns-issues ${tone}`}>
      <div className="ns-issues-head">
        <h3>{title}</h3>
        {onShow ? (
          <button type="button" onClick={onShow}>
            Показать в таблице
          </button>
        ) : null}
      </div>
      <div className="ns-issues-cols" aria-hidden="true">
        <span>{columns[0]}</span>
        <span>{columns[1]}</span>
        <span>{columns[2]}</span>
      </div>
      <ul>{children}</ul>
      {more ? <p className="caption">{more}</p> : null}
    </div>
  );
}

function MismatchItem({ item }: { item: NsMismatch }) {
  return (
    <li>
      <a href={item.url} target="_blank" rel="noreferrer">
        {item.host}
      </a>
      <p className="ns-pair" data-label="ожидалось">
        {formatNsHosts(item.expected)}
      </p>
      <p className="ns-pair" data-label="сейчас">
        {formatNsHosts(item.live, "не резолвится")}
      </p>
    </li>
  );
}

function ProblemItem({ item }: { item: NsProblem }) {
  return (
    <li>
      <a href={item.url} target="_blank" rel="noreferrer">
        {item.host}
      </a>
      <p className="ns-pair" data-label="причина">
        {item.reason}
      </p>
      <p className="ns-pair" data-label="NS">
        {item.nameservers.length ? item.nameservers.join(" · ") : "NS нет"}
      </p>
    </li>
  );
}
