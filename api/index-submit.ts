import { submitIndexUrls } from "../src/lib/speedyindex";

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
  const result = await submitIndexUrls(urls, process.env.SPEEDYINDEX_API_KEY);
  return Response.json(result.body, { status: result.status });
}

export function POST(request: Request): Promise<Response> {
  return handle(request);
}

export default function handler(request: Request): Promise<Response> {
  return handle(request);
}
