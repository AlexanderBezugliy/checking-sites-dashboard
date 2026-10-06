/** Серверный клиент SpeedyIndex. Файл самодостаточный: Vercel не подхватывает импорты из src. */

export const SPEEDYINDEX_TOKENS_PER_URL = 100;
export const SPEEDYINDEX_MAX_URLS = 1000;

const ACCOUNT_URL = "https://api.speedyindex.com/v2/account";
const CREATE_URL = "https://api.speedyindex.com/v2/task/google/indexer/create";

export type IndexSubmitBody = {
  ok: boolean;
  code: number | null;
  taskId: string | null;
  accepted: string[];
  message: string;
};

export type IndexSubmitResult = {
  status: number;
  body: IndexSubmitBody;
};

function fail(
  status: number,
  message: string,
  code: number | null = null,
): IndexSubmitResult {
  return { status, body: { ok: false, code, taskId: null, accepted: [], message } };
}

export function acceptSubmitUrls(input: unknown): { urls: string[]; error: string | null } {
  if (!Array.isArray(input) || input.length === 0) {
    return { urls: [], error: "Нет страниц для отправки" };
  }
  if (input.length > SPEEDYINDEX_MAX_URLS) {
    return {
      urls: [],
      error: `За один раз можно отправить не больше ${SPEEDYINDEX_MAX_URLS} страниц`,
    };
  }
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const url = item.trim();
    if (!url || seen.has(url)) continue;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
    seen.add(url);
    urls.push(url);
  }
  if (!urls.length) return { urls: [], error: "Нет страниц для отправки" };
  return { urls, error: null };
}

async function speedyFetch(
  url: string,
  apiKey: string,
  init?: RequestInit,
): Promise<{ code: number | null; payload: Record<string, unknown> | null }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const code = payload && typeof payload.code === "number" ? payload.code : null;
  return { code, payload };
}

function balanceTokens(payload: Record<string, unknown> | null): number | null {
  const balance = payload?.balance;
  if (!balance || typeof balance !== "object") return null;
  const tokens = (balance as { tokens?: unknown }).tokens;
  return typeof tokens === "number" ? tokens : null;
}

function readApiKey(): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return env?.SPEEDYINDEX_API_KEY;
}

export async function submitIndexUrls(
  input: unknown,
  apiKey: string | undefined,
): Promise<IndexSubmitResult> {
  const key = apiKey?.trim();
  if (!key) return fail(503, "Ключ SpeedyIndex не задан на сервере");

  const accepted = acceptSubmitUrls(input);
  if (accepted.error) return fail(400, accepted.error);

  const need = accepted.urls.length * SPEEDYINDEX_TOKENS_PER_URL;
  let account: { code: number | null; payload: Record<string, unknown> | null };
  try {
    account = await speedyFetch(ACCOUNT_URL, key);
  } catch {
    return fail(502, "Не удалось связаться со SpeedyIndex");
  }
  const tokens = balanceTokens(account.payload);
  if (account.code !== 0 || tokens == null) {
    return fail(502, "SpeedyIndex не отдал баланс", account.code);
  }
  if (tokens < need) {
    return fail(402, `Не хватает токенов: нужно ${need}, на балансе ${tokens}`, 1);
  }

  let created: { code: number | null; payload: Record<string, unknown> | null };
  try {
    created = await speedyFetch(CREATE_URL, key, {
      method: "POST",
      body: JSON.stringify({
        title: "checking-sites dashboard",
        urls: accepted.urls,
        pay_per_indexed: true,
      }),
    });
  } catch {
    return fail(502, "Не удалось связаться со SpeedyIndex");
  }

  const taskId = typeof created.payload?.task_id === "string" ? created.payload.task_id : null;
  if (created.code === 0 && taskId) {
    const count = accepted.urls.length;
    const message =
      count === 1 ? "Страница принята в индексацию" : `Принято в индексацию: ${count}`;
    return {
      status: 200,
      body: { ok: true, code: 0, taskId, accepted: accepted.urls, message },
    };
  }
  if (created.code === 1) return fail(402, "Не хватает токенов SpeedyIndex", 1);
  if (created.code === 2) return fail(400, "SpeedyIndex не принял запрос", 2);
  return fail(502, "SpeedyIndex не принял запрос", created.code);
}

const REJECTED = {
  ok: false,
  code: null,
  taskId: null,
  accepted: [] as string[],
  message: "Нужен POST",
};

async function handle(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json(REJECTED, { status: 405 });
  }
  let urls: unknown;
  try {
    const body = (await request.json()) as { urls?: unknown };
    urls = body.urls;
  } catch {
    urls = undefined;
  }
  const result = await submitIndexUrls(urls, readApiKey());
  return Response.json(result.body, { status: result.status });
}

export function POST(request: Request): Promise<Response> {
  return handle(request);
}
