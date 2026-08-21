import { useState } from "react";
import { FleetOverview } from "./components/FleetOverview";
import { Header } from "./components/Header";
import { KpiGrid } from "./components/KpiGrid";
import { NsStrip } from "./components/NsStrip";
import { SiteTable } from "./components/SiteTable";
import { useFleetStatus } from "./hooks/useFleetStatus";
import type { TableFilter } from "./types";

/** Корень дашборда. Новые блоки подключайте рядом с NsStrip / FleetOverview. */
export default function App() {
  const { payload, metrics, error, loading, refresh } = useFleetStatus();
  const [filter, setFilter] = useState<TableFilter>("all");
  const [tableJump, setTableJump] = useState(0);

  function showInTable(next: TableFilter) {
    setFilter(next);
    setTableJump((count) => count + 1);
  }

  return (
    <div className="shell">
      <Header
        payload={payload}
        loading={loading}
        onRefresh={() => void refresh()}
      />

      {error ? <p className="banner">{error}</p> : null}

      {metrics && payload ? (
        <>
          <KpiGrid metrics={metrics} />
          <NsStrip
            metrics={metrics}
            onShowProblems={() => showInTable("ns")}
            onShowMismatches={() => showInTable("nsbad")}
          />
          <FleetOverview payload={payload} metrics={metrics} />
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
