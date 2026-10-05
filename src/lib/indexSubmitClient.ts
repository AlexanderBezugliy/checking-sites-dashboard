import type { IndexSubmitBody } from "./speedyindex";

const EMPTY: IndexSubmitBody = {
  ok: false,
  code: null,
  taskId: null,
  accepted: [],
  message: "Сервер панели вернул пустой ответ",
};

export async function requestIndexSubmit(urls: string[]): Promise<IndexSubmitBody> {
  const response = await fetch("/api/index-submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });
  const data = (await response.json().catch(() => null)) as IndexSubmitBody | null;
  if (!data || typeof data.message !== "string" || typeof data.ok !== "boolean") return EMPTY;
  return data;
}
