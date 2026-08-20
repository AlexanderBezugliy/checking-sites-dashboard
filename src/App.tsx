import { useState } from "react";
import { FleetOverview } from "./components/FleetOverview";
import { Header } from "./components/Header";
import { KpiGrid } from "./components/KpiGrid";
import { SiteTable } from "./components/SiteTable";
import { useFleetStatus } from "./hooks/useFleetStatus";
import type { TableFilter } from "./types";

/** Корень дашборда. Новые блоки подключайте рядом с NsStrip / FleetOverview. */
export default function App() {
  const { payload, metrics, error, loading, refresh } = useFleetStatus();
  const [filter, setFilter] = useState<TableFilter>("all");

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
          <KpiGrid
            metrics={metrics}
            onShowNsProblems={() => setFilter("ns")}
          />
          <FleetOverview payload={payload} metrics={metrics} />
          <SiteTable
            rows={payload.data}
            metrics={metrics}
            filter={filter}
            onFilterChange={setFilter}
          />
        </>
      ) : loading ? (
        <p className="empty">Загружаю статус флота…</p>
      ) : null}
    </div>
  );
}
