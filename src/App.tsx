import { useState } from "react";
import { KpiGrid } from "./components/KpiGrid";
import { SiteTable } from "./components/SiteTable";
import { useFleetStatus } from "./hooks/useFleetStatus";
import { AppShell } from "./shell/AppShell";
import type { TableFilter } from "./types";

export default function App() {
  const { payload, metrics, error, loading } = useFleetStatus();
  const [filter, setFilter] = useState<TableFilter>("all");
  const [tableJump, setTableJump] = useState(0);

  function showInTable(next: TableFilter) {
    setFilter(next);
    setTableJump((count) => count + 1);
  }

  return (
    <AppShell filter={filter} metrics={metrics} onFilter={showInTable}>
      {error ? <p className="banner">{error}</p> : null}

      {metrics && payload ? (
        <>
          <KpiGrid
            metrics={metrics}
            payload={payload}
            rows={payload.data}
            filter={filter}
            onFilter={showInTable}
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
    </AppShell>
  );
}
