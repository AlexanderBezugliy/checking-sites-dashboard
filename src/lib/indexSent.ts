const STORAGE_KEY = "checking-sites.index-sent";

export type IndexSent = {
  at: string;
  taskId: string;
};

export function readIndexSent(): Record<string, IndexSent> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const sent: Record<string, IndexSent> = {};
    for (const [url, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue;
      const row = value as { at?: unknown; taskId?: unknown };
      if (typeof row.at !== "string" || typeof row.taskId !== "string") continue;
      sent[url] = { at: row.at, taskId: row.taskId };
    }
    return sent;
  } catch {
    return {};
  }
}

export function rememberIndexSent(
  urls: string[],
  taskId: string,
  at = new Date().toISOString(),
): Record<string, IndexSent> {
  const sent = readIndexSent();
  for (const url of urls) sent[url] = { at, taskId };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sent));
  } catch {
    /* приватный режим может запретить запись */
  }
  return sent;
}
