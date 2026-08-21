import type { CSSProperties } from "react";
import { config } from "../config";
import { formatKyiv, formatMs, formatSslSummary } from "../lib/format";
import { buildDigest, httpMixParts } from "../lib/metrics";
import type { Metrics, StatusPayload } from "../types";

export function FleetOverview({
  payload,
  metrics,
}: {
  payload: StatusPayload;
  metrics: Metrics;
}) {
  const mix = httpMixParts(metrics);
  const maxBucket = Math.max(1, ...metrics.buckets.map((bucket) => bucket.count));
  const topZones = metrics.zones.slice(0, 7);
  const maxZone = Math.max(1, ...topZones.map((zone) => zone.count));

  return (
    <section className="grid">
      <article className="panel reveal delay-2">
        <h2>Ответ сервера</h2>
        <p className="hint">
          200 — страница открылась. 302 — редирект на себя, сайт живой. 503 —
          клоака, для монитора это норма.
        </p>
        <div className="mix">
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
        <ul className="legend">
          <li>
            <i className="ok" /> <b className="ok-text">200</b> · {metrics.http200}
          </li>
          <li>
            <i className="redirect" /> <b className="redirect-text">302</b> ·{" "}
            {metrics.http302}
          </li>
          <li>
            <i className="cloak" /> <b className="cloak-text">503</b> · {metrics.cloak503}
          </li>
          {mix.other > 0 ? (
            <li>
              <i className="down" /> <b className="down-text">ошибка</b> · {mix.other}
            </li>
          ) : null}
        </ul>
        <dl className="facts">
          <div>
            <dt>SSL</dt>
            <dd>{formatSslSummary(metrics)}</dd>
          </div>
          <div>
            <dt>Чужой редирект</dt>
            <dd>{metrics.foreignRedirects}</dd>
          </div>
          <div>
            <dt>Дубли URL</dt>
            <dd>{metrics.duplicateUrls}</dd>
          </div>
        </dl>
      </article>

      <article className="panel reveal delay-3">
        <h2>Время ответа</h2>
        <p className="hint">
          p50 {formatMs(metrics.durationP50)} · p95 {formatMs(metrics.durationP95)}.
          Столбцы — сколько сайтов попало в интервал.
        </p>
        <div className="bars">
          {metrics.buckets.map((bucket) => (
            <div key={bucket.label}>
              <b
                style={{ "--bar": `${(bucket.count / maxBucket) * 100}%` } as CSSProperties}
              />
              <em>{bucket.count}</em>
              <span>{bucket.label}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel panel-zones reveal delay-4">
        <h2>Зоны</h2>
        <p className="hint">Сколько доменов в каждой зоне из sites.json.</p>
        <ul className="zones">
          {topZones.map((zone) => (
            <li key={zone.name}>
              <span>{zone.name}</span>
              <div>
                <b
                  style={{ "--bar": `${(zone.count / maxZone) * 100}%` } as CSSProperties}
                />
              </div>
              <em>{zone.count}</em>
            </li>
          ))}
        </ul>
      </article>

      <article className="panel digest reveal delay-5">
        <h2>Канал {config.telegramChannel}</h2>
        <p className="hint">
          Дайджест, который {config.telegramBot} шлёт в группу. История чата не
          читается — берём status.json.
        </p>
        <pre>{buildDigest(payload, metrics)}</pre>
        {payload.last_digest_at ? (
          <p className="caption">
            Последний дайджест: {formatKyiv(payload.last_digest_at)}
          </p>
        ) : null}
      </article>
    </section>
  );
}
