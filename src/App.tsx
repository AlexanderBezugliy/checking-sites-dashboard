import { useState } from "react";
import { IndexStrip } from "./components/IndexStrip";
import { KpiGrid } from "./components/KpiGrid";
import { NsStrip } from "./components/NsStrip";
import { SiteTable } from "./components/SiteTable";
import { useFleetStatus } from "./hooks/useFleetStatus";
import type { TableFilter } from "./types";

/** Корень дашборда. Новые блоки подключайте рядом с NsStrip. */
export default function App() {
  const { payload, metrics, error, loading } = useFleetStatus();
  const [filter, setFilter] = useState<TableFilter>("all");
  const [tableJump, setTableJump] = useState(0);

  function showInTable(next: TableFilter) {
    setFilter(next);
    setTableJump((count) => count + 1);
  }

  return (
    <div className="shell">
      {error ? <p className="banner">{error}</p> : null}

      {metrics && payload ? (
        <>
          <KpiGrid metrics={metrics} payload={payload} />
          <NsStrip
            metrics={metrics}
            onShowProblems={() => showInTable("ns")}
            onShowMismatches={() => showInTable("nsbad")}
          />
          <IndexStrip
            metrics={metrics}
            rows={payload.data}
            onShowBad={() => showInTable("indexbad")}
            onShowPartial={() => showInTable("indexpartial")}
            onShowStale={() => showInTable("indexstale")}
            onShowNoindex={() => showInTable("indexnoindex")}
            onShowSkip={() => showInTable("indexskip")}
            onShowDrop={() => showInTable("indexdrop")}
            onShowUnknown={() => showInTable("indexunknown")}
          />
          <SiteTable
            rows={payload.data}
            metrics={metrics}
            filter={filter}
            jumpToken={tableJump}
            onFilterChange={setFilter}
          />
        </>
      ) : loading ? (
        <p className="empty">Загружаю статус флота…</p>
      ) : null}
    </div>
  );
}
