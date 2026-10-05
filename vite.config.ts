/// <reference types="vitest/config" />
import type { Connect, Plugin } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { submitIndexUrls } from "./src/lib/speedyindex.ts";

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Локальный `npm run dev` не поднимает Vercel Functions. Тот же обработчик, что `api/index-submit.ts`. */
function indexSubmitDevPlugin(): Plugin {
  return {
    name: "index-submit-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0];
        if (path !== "/api/index-submit") {
          next();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              code: null,
              taskId: null,
              accepted: [],
              message: "Нужен POST",
            }),
          );
          return;
        }
        let urls: unknown;
        try {
          const raw = await readBody(req);
          urls = (JSON.parse(raw) as { urls?: unknown }).urls;
        } catch {
          urls = undefined;
        }
        const result = await submitIndexUrls(urls, process.env.SPEEDYINDEX_API_KEY);
        res.statusCode = result.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), indexSubmitDevPlugin()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
