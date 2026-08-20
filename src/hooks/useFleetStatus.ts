import { useCallback, useEffect, useMemo, useState } from "react";
import { config } from "../config";
import { computeMetrics } from "../lib/metrics";
import { loadStatus } from "../lib/status";
import type { DataSource, Metrics, StatusPayload } from "../types";

export function useFleetStatus() {
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyResult = useCallback(async () => {
    const result = await loadStatus();
    setPayload(result.payload);
    setSource(result.source);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await applyResult();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [applyResult]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await loadStatus();
        if (cancelled) return;
        setPayload(result.payload);
        setSource(result.source);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const id = window.setInterval(() => {
      void applyResult().catch(() => {
        /* оставляем последний удачный payload */
      });
    }, config.refreshMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [applyResult]);

  const metrics: Metrics | null = useMemo(
    () => (payload ? computeMetrics(payload) : null),
    [payload],
  );

  return { payload, metrics, source, error, loading, refresh };
}
