import { config } from "../config";
import type { DataSource, StatusPayload } from "../types";

export type LoadedStatus = {
  payload: StatusPayload;
  source: DataSource;
};

function isStatusPayload(value: unknown): value is StatusPayload {
  if (!value || typeof value !== "object") return false;
  const data = (value as StatusPayload).data;
  return Array.isArray(data);
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`);
  return res.json();
}

/** Сначала живой GitHub, при сбое — локальный снимок `public/status.json`. */
export async function loadStatus(): Promise<LoadedStatus> {
  try {
    const payload = await fetchJson(
      `${config.remoteStatusUrl}?t=${Date.now()}`,
    );
    if (!isStatusPayload(payload)) throw new Error("Некорректный status.json");
    return { payload, source: "github" };
  } catch {
    const payload = await fetchJson(config.localStatusUrl);
    if (!isStatusPayload(payload)) {
      throw new Error("Не удалось загрузить status.json");
    }
    return { payload, source: "snapshot" };
  }
}
