import { httpMixParts } from "../lib/metrics";
import type { Metrics } from "../types";

export function KpiGrid({ metrics }: { metrics: Metrics }) {
  const nsFailed = metrics.nsProblems.length;
  const mix = httpMixParts(metrics);
  const troubled = metrics.failed + nsFailed;
  const pct = (n: number) => Math.round((n / mix.total) * 100);

  return (
    <section className="summary reveal">
      <article className={troubled ? "summary-health is-down" : "summary-health is-ok"}>
        <p className="summary-title">
          {troubled ? `Проблемы: ${troubled}` : "Online"}
        </p>
        <p className="summary-frac">
          <b>{metrics.alive}</b>
          <span> / {metrics.total}</span>
        </p>
        <ul className="summary-flags">
          <li className={metrics.failed ? "is-down" : "is-ok"}>
            Падения <b>{metrics.failed}</b>
          </li>
          <li className={nsFailed ? "is-down" : "is-ok"}>
            NS <b>{nsFailed}</b>
          </li>
        </ul>
      </article>

      <article className="summary-mix">
        <p className="summary-kicker">Как отвечают</p>
        <div className="summary-bar" aria-hidden="true">
          {mix.okShare > 0 ? (
            <span className="ok" style={{ flex: mix.okShare }} />
          ) : null}
          {mix.redirectShare > 0 ? (
            <span className="redirect" style={{ flex: mix.redirectShare }} />
          ) : null}
          {mix.cloakShare > 0 ? (
            <span className="cloak" style={{ flex: mix.cloakShare }} />
          ) : null}
          {mix.otherShare > 0 ? (
            <span className="down" style={{ flex: mix.otherShare }} />
          ) : null}
        </div>
        <div className="summary-split">
          <div className="is-ok">
            <span>HTTP 200</span>
            <b>{metrics.http200}</b>
            <em>{pct(metrics.http200)}%</em>
          </div>
          <div className="is-redirect">
            <span>Редирект 302</span>
            <b>{metrics.http302}</b>
            <em>{pct(metrics.http302)}%</em>
          </div>
          <div className="is-cloak">
            <span>Клоака 503</span>
            <b>{metrics.cloak503}</b>
            <em>{pct(metrics.cloak503)}%</em>
          </div>
          {mix.other > 0 ? (
            <div className="is-down">
              <span>Ошибка</span>
              <b>{mix.other}</b>
              <em>{pct(mix.other)}%</em>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
