import type { Metrics } from "../types";

export function NsStrip({
  metrics,
  onShowProblems,
}: {
  metrics: Metrics;
  onShowProblems?: () => void;
}) {
  const failed = metrics.nsProblems.length;
  const ok = metrics.nsOk;

  return (
    <section
      className={failed ? "ns-strip alert" : "ns-strip ok"}
    >
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

      <ul className="ns-providers">
        {metrics.nsProviders.map((item) => (
          <li key={item.name}>
            <span>{item.name}</span>
            <em>{item.count}</em>
          </li>
        ))}
        {metrics.nsProviders.length === 0 ? <li>Нет NS-записей</li> : null}
      </ul>

      {failed ? (
        <div className="ns-problems">
          <div className="ns-problems-head">
            <h3>Что сломано</h3>
            {onShowProblems ? (
              <button type="button" onClick={onShowProblems}>
                Показать в таблице
              </button>
            ) : null}
          </div>
          <ul>
            {metrics.nsProblems.slice(0, 8).map((item, index) => (
              <li key={`${item.url}-${index}`}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.host}
                </a>
                <span>{item.reason}</span>
                <em>
                  {item.nameservers.length
                    ? item.nameservers.join(" · ")
                    : "NS нет"}
                </em>
              </li>
            ))}
          </ul>
          {failed > 8 ? (
            <p className="caption">Ещё {failed - 8} — откройте фильтр NS</p>
          ) : null}
        </div>
      ) : (null)}
    </section>
  );
}
